import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { GlobalChatService } from './global-chat.service';
import { GlobalChatRedisService } from './services/global-chat-redis.service';
import { GlobalMessageType } from './entities/global-chat-message.entity';
import { User } from '../../users/user.entity';

interface SocketWithUser extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/global-chat',
  transports: ['websocket', 'polling'],
  // Optimize WebSocket performance (similar to meeting gateway)
  maxHttpBufferSize: 1e8, // 100 MB
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
})
@Injectable()
export class GlobalChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GlobalChatGateway.name);
  // Note: In-memory maps are kept for quick access, but Redis is source of truth for scaling
  private connectedUsers = new Map<string, SocketWithUser>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly globalChatService: GlobalChatService,
    private readonly redisService: GlobalChatRedisService,
  ) {}

  async handleConnection(client: SocketWithUser) {
    try {
      // Extract userId from query or auth (similar to meeting gateway)
      // Don't require JWT verification - just get userId
      const userId = client.handshake.query?.userId as string || 
                     client.handshake.auth?.userId ||
                     client.handshake.query?.token || // Fallback: try to extract from token if provided
                     client.handshake.auth?.token;

      // If token provided, try to extract userId from it (optional)
      let extractedUserId = userId;
      if (userId && (userId.includes('Bearer ') || userId.length > 50)) {
        // Looks like a token, try to decode it
        try {
          const token = userId.replace('Bearer ', '').trim();
          const payload = this.jwtService.verify(token);
          extractedUserId = payload.sub || payload.id;
        } catch (error) {
          // Token verification failed, but don't disconnect - just log
          this.logger.warn(`⚠️ Token verification failed, but continuing connection: ${error.message}`);
        }
      }

      if (!extractedUserId) {
        this.logger.warn(`⚠️ No userId provided, but allowing connection (similar to meeting gateway)`);
        // Don't disconnect - allow connection like meeting gateway does
      } else {
        // Validate and fetch user (optional authentication check - similar to meeting gateway)
        try {
          const user = await this.userRepository.findOne({ where: { id: extractedUserId } });
          if (user) {
            client.user = user;
            client.userId = extractedUserId;
            this.logger.log(`✅ User authenticated: ${user.username}`);
          } else {
            this.logger.warn(`⚠️ User not found: ${extractedUserId}, but allowing connection`);
            client.userId = extractedUserId;
          }
        } catch (error) {
          this.logger.error(`❌ Failed to fetch user: ${error.message}`);
          // Don't disconnect - allow connection like meeting gateway
          client.userId = extractedUserId;
        }
      }

      // Store in-memory for quick access
      this.connectedUsers.set(client.id, client);

      // Mark user as online in Redis (for cross-instance sync)
      if (client.userId) {
        await this.redisService.setUserOnline(client.userId, client.id);
        
        // Check if user already has connection on another instance
        const existingSocketId = await this.redisService.getUserSocketId(client.userId);
        if (existingSocketId && existingSocketId !== client.id) {
          this.logger.log(`⚠️ User ${client.userId} may have active connection on another instance: ${existingSocketId}`);
          // Don't disconnect - Redis adapter will handle cross-instance messaging
        }
      }
      
      this.logger.log(`✅ User connected to global chat: ${client.user?.username || client.userId || 'Anonymous'} (${client.id})`);

      // Join global chat room
      client.join('global-chat-room');

      // Get online users count from Redis
      const onlineCount = await this.redisService.getOnlineUsersCount();

      // Notify others about user joining (Redis adapter will broadcast to all instances)
      if (client.userId) {
        this.server.to('global-chat-room').emit('user:joined', {
          userId: client.userId,
          username: client.user?.username || 'Unknown',
          timestamp: new Date(),
          onlineCount,
        });
      }
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`, error.stack);
      // Don't disconnect on error - allow connection like meeting gateway
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    this.connectedUsers.delete(client.id);
    
    // Mark user as offline in Redis
    if (client.userId) {
      await this.redisService.setUserOffline(client.userId);
    }
    
    this.logger.log(`👋 User disconnected from global chat: ${client.user?.username || client.userId} (${client.id})`);

    // Get updated online users count
    const onlineCount = await this.redisService.getOnlineUsersCount();

    // Notify others about user leaving (Redis adapter will broadcast to all instances)
    this.server.to('global-chat-room').emit('user:left', {
      userId: client.userId,
      username: client.user?.username,
      timestamp: new Date(),
      onlineCount,
    });
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { message: string; replyTo?: string },
  ) {
    if (!client.userId || !client.user) {
      this.logger.error('❌ Cannot send message: No user');
      client.emit('chat:error', { message: 'Authentication required' });
      return;
    }

    try {
      // Rate limiting check
      const rateLimit = await this.redisService.checkRateLimit(client.userId, 20, 60); // 20 messages per minute
      if (!rateLimit.allowed) {
        client.emit('chat:error', {
          message: 'Rate limit exceeded. Please wait before sending another message.',
          rateLimit: {
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt,
          },
        });
        return;
      }

      // Save message to database
      const chatMessage = await this.globalChatService.createMessage(
        client.userId,
        data.message,
        GlobalMessageType.TEXT,
        data.replyTo ? { reply_to: data.replyTo } : null,
      );

      // Cache message in Redis for quick retrieval
      await this.redisService.cacheMessage(chatMessage.id, chatMessage, 3600);

      // Broadcast to ALL users in global chat (Redis adapter will sync across instances)
      const broadcastData = {
        id: chatMessage.id,
        message: chatMessage.message,
        senderId: chatMessage.sender_id,
        senderName: chatMessage.sender?.username || 'Unknown User',
        senderAvatar: chatMessage.sender?.avatar_url || null,
        timestamp: chatMessage.created_at.toISOString(),
        type: chatMessage.type,
        metadata: chatMessage.metadata,
      };

      // Emit to all clients in global-chat-room (Redis adapter handles cross-instance sync)
      this.server.to('global-chat-room').emit('chat:message', broadcastData);

      this.logger.log(`💬 Global chat message sent by ${client.user.username}: ${data.message.substring(0, 50)}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send message: ${error.message}`);
      client.emit('chat:error', { message: error.message || 'Failed to send message' });
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isTyping: boolean },
  ) {
    if (!client.userId || !client.user) return;

    // Broadcast typing status to others (not sender)
    client.to('global-chat-room').emit('chat:typing', {
      userId: client.userId,
      username: client.user.username || client.user.email || 'Unknown User',
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:get-messages')
  async handleGetMessages(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { page?: number; limit?: number; before?: string },
  ) {
    if (!client.userId || !client.user) {
      client.emit('chat:error', { message: 'Authentication required' });
      return;
    }

    try {
      const beforeDate = data.before ? new Date(data.before) : undefined;
      const messages = await this.globalChatService.getMessages({
        page: data.page || 1,
        limit: data.limit || 50,
        before: beforeDate,
      });

      client.emit('chat:messages', messages);
    } catch (error) {
      this.logger.error(`❌ Failed to get messages: ${error.message}`);
      client.emit('chat:error', { message: 'Failed to fetch messages' });
    }
  }
}

