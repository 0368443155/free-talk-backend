import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { SendMessageDto } from '../dto/send-message.dto';
import { ReactToMessageDto } from '../dto/react-to-message.dto';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: SendMessageDto,
  ) {
    if (!client.meetingId || !client.userId) {
      this.logger.error('Cannot send message: No meeting or user ID');
      client.emit('chat:error', { message: 'Not connected to a room' });
      return;
    }

    try {
      // Validate room feature
      const hasChat = await this.baseRoomService.hasFeature(
        client.meetingId,
        RoomFeature.CHAT,
      );
      if (!hasChat) {
        client.emit('chat:error', { message: 'Chat is disabled in this room' });
        return;
      }

      // Send message
      const savedMessage = await this.chatService.sendMessage(
        client.meetingId,
        client.userId,
        dto,
      );

      // Broadcast to room
      const broadcastData = {
        id: savedMessage.id,
        message: savedMessage.message,
        senderId: savedMessage.sender.id,
        senderName: savedMessage.sender.username,
        senderAvatar: savedMessage.sender.avatar_url,
        replyTo: dto.replyTo,
        timestamp: savedMessage.created_at.toISOString(),
        type: savedMessage.type,
      };

      this.server.to(client.meetingId).emit('chat:message', broadcastData);

      this.logger.log(
        `Message sent by ${client.userId} in room ${client.meetingId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending message:`, error);
      client.emit('chat:error', {
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    if (!client.userId) {
      return;
    }

    // Broadcast typing indicator to room (excluding sender)
    client.to(data.roomId).emit('chat:user-typing', {
      userId: client.userId,
      username: client.user?.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:react')
  async handleReaction(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: ReactToMessageDto,
  ) {
    if (!client.userId) {
      client.emit('chat:error', { message: 'User not authenticated' });
      return;
    }

    try {
      const message = await this.chatService.addReaction(
        dto.messageId,
        client.userId,
        dto.reaction,
      );

      // Broadcast reaction update
      if (client.meetingId) {
        this.server.to(client.meetingId).emit('chat:reaction', {
          messageId: dto.messageId,
          reaction: dto.reaction,
          userId: client.userId,
          reactions: message.metadata?.reactions || {},
        });
      }
    } catch (error) {
      this.logger.error(`Error adding reaction:`, error);
      client.emit('chat:error', {
        message: error instanceof Error ? error.message : 'Failed to add reaction',
      });
    }
  }

  @SubscribeMessage('chat:history')
  async handleGetHistory(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { roomId: string; limit?: number },
  ) {
    if (!client.userId) {
      return;
    }

    try {
      const messages = await this.chatService.getChatHistory(
        data.roomId,
        data.limit || 50,
      );

      client.emit('chat:history', {
        messages: messages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          senderId: msg.sender.id,
          senderName: msg.sender.username,
          senderAvatar: msg.sender.avatar_url,
          timestamp: msg.created_at.toISOString(),
          type: msg.type,
          metadata: msg.metadata,
        })),
      });
    } catch (error) {
      this.logger.error(`Error getting chat history:`, error);
      client.emit('chat:error', {
        message: 'Failed to get chat history',
      });
    }
  }
}

