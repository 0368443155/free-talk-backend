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
import { JwtService } from '@nestjs/jwt';
import { GlobalChatService } from './global-chat.service';
import { GlobalMessageType } from './entities/global-chat-message.entity';

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
})
@Injectable()
export class GlobalChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GlobalChatGateway.name);
  private connectedUsers = new Map<string, SocketWithUser>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly globalChatService: GlobalChatService,
  ) {}

  async handleConnection(client: SocketWithUser) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`❌ Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string);
      client.userId = payload.id;
      client.user = payload;

      this.connectedUsers.set(client.id, client);
      
      this.logger.log(`✅ User connected to global chat: ${client.user?.username || client.userId} (${client.id})`);

      // Join global chat room
      client.join('global-chat-room');

      // Notify others about user joining (optional)
      client.to('global-chat-room').emit('user:joined', {
        userId: client.userId,
        username: client.user?.username,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    this.connectedUsers.delete(client.id);
    
    this.logger.log(`👋 User disconnected from global chat: ${client.user?.username || client.userId} (${client.id})`);

    // Notify others about user leaving (optional)
    client.to('global-chat-room').emit('user:left', {
      userId: client.userId,
      username: client.user?.username,
      timestamp: new Date(),
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
      // Save message to database
      const chatMessage = await this.globalChatService.createMessage(
        client.userId,
        data.message,
        GlobalMessageType.TEXT,
        data.replyTo ? { reply_to: data.replyTo } : null,
      );

      // Broadcast to ALL users in global chat
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
      username: client.user.username,
      isTyping: data.isTyping,
    });
  }
}

