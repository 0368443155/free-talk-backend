import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { UserSocketManagerService } from '../../core/room/services/user-socket-manager.service';

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
    username?: string;
    bookingId?: string;
  };
  userId?: string;
  bookingId?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class BookingGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BookingGateway.name);
  private userSocketMap = new Map<string, string>();

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private readonly userSocketManager: UserSocketManagerService,
  ) {}

  /**
   * Join booking room
   */
  @SubscribeMessage('booking:join')
  async handleJoin(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { bookingId: string; userId: string },
  ) {
    try {
      // Verify booking exists and user is participant
      const booking = await this.bookingRepository.findOne({
        where: { id: data.bookingId },
        relations: ['student', 'teacher'],
      });

      if (!booking) {
        throw new WsException('Booking not found');
      }

      const userId = data.userId || client.data?.userId;
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Verify user is participant
      if (booking.student_id !== userId && booking.teacher_id !== userId) {
        throw new WsException('You are not a participant in this booking');
      }

      // Store booking and user info
      client.data = client.data || {};
      client.data.bookingId = data.bookingId;
      client.data.userId = userId;
      client.bookingId = data.bookingId;
      client.userId = userId;

      // Join room
      await client.join(data.bookingId);
      this.userSocketMap.set(userId, client.id);

      // Track socket in UserSocketManager
      await this.userSocketManager.trackUserSocket(userId, client.id);

      // Notify other participant
      client.to(data.bookingId).emit('booking:user-joined', {
        userId,
      });

      this.logger.log(`User ${userId} joined booking ${data.bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to join booking: ${error.message}`);
      client.emit('booking:join-error', {
        message: error.message || 'Failed to join booking',
      });
    }
  }

  /**
   * Leave booking room
   */
  @SubscribeMessage('booking:leave')
  handleLeave(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { bookingId: string; userId: string },
  ) {
    const userId = data.userId || client.data?.userId || client.userId;
    const bookingId = data.bookingId || client.bookingId;

    if (bookingId) {
      client.to(bookingId).emit('booking:user-left', {
        userId,
      });
    }

    if (userId) {
      this.userSocketMap.delete(userId);
      this.userSocketManager.removeUserSocket(userId).catch(err => {
        this.logger.warn(`Failed to remove user socket: ${err.message}`);
      });
    }

    this.logger.log(`User ${userId} left booking ${bookingId}`);
  }

  /**
   * WebRTC Signaling - Ready
   */
  @SubscribeMessage('media:ready')
  handleReady(@ConnectedSocket() client: SocketWithUser) {
    const bookingId = client.bookingId || client.data?.bookingId;
    const userId = client.userId || client.data?.userId;

    if (!bookingId || !userId) {
      this.logger.warn('media:ready called without bookingId or userId');
      return;
    }

    this.logger.debug(`User ${userId} is ready for WebRTC in booking ${bookingId}`);

    // Broadcast to other participant
    client.to(bookingId).emit('media:peer-ready', {
      userId,
    });
  }

  /**
   * WebRTC Signaling - Offer
   */
  @SubscribeMessage('media:offer')
  async handleOffer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; offer: any },
  ) {
    try {
      const fromUserId = client.userId || client.data?.userId;
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:offer from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = this.userSocketMap.get(data.targetUserId) || null;
      }

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('media:offer', {
          fromUserId,
          roomId: data.roomId,
          offer: data.offer,
        });
        this.logger.debug(`Successfully forwarded media:offer to ${data.targetUserId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:offer: ${error.message}`);
    }
  }

  /**
   * WebRTC Signaling - Answer
   */
  @SubscribeMessage('media:answer')
  async handleAnswer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; answer: any },
  ) {
    try {
      const fromUserId = client.userId || client.data?.userId;
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:answer from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = this.userSocketMap.get(data.targetUserId) || null;
      }

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('media:answer', {
          fromUserId,
          roomId: data.roomId,
          answer: data.answer,
        });
        this.logger.debug(`Successfully forwarded media:answer to ${data.targetUserId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:answer: ${error.message}`);
    }
  }

  /**
   * WebRTC Signaling - ICE Candidate
   */
  @SubscribeMessage('media:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; candidate: any },
  ) {
    try {
      const fromUserId = client.userId || client.data?.userId;
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:ice-candidate from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = this.userSocketMap.get(data.targetUserId) || null;
      }

      if (targetSocketId) {
        this.server.to(targetSocketId).emit('media:ice-candidate', {
          fromUserId,
          roomId: data.roomId,
          candidate: data.candidate,
        });
        this.logger.debug(`Successfully forwarded media:ice-candidate to ${data.targetUserId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:ice-candidate: ${error.message}`);
    }
  }

  /**
   * Media State Update
   */
  @SubscribeMessage('media:state-update')
  async handleMediaStateUpdate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      roomId: string;
      isMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
    },
  ) {
    try {
      const userId = client.userId || client.data?.userId;
      const bookingId = client.bookingId || client.data?.bookingId || data.roomId;

      if (!userId || !bookingId) {
        throw new WsException('User or booking not found');
      }

      // Broadcast to other participant
      client.to(bookingId).emit('media:participant-state-updated', {
        userId,
        ...data,
      });
    } catch (error) {
      this.logger.error(`Failed to handle media:state-update: ${error.message}`);
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(@ConnectedSocket() client: SocketWithUser) {
    const userId = client.userId || client.data?.userId;
    const bookingId = client.bookingId || client.data?.bookingId;

    if (userId) {
      this.userSocketMap.delete(userId);
      this.userSocketManager.removeUserSocket(userId).catch(err => {
        this.logger.warn(`Failed to remove user socket: ${err.message}`);
      });
    }

    if (bookingId) {
      client.to(bookingId).emit('booking:user-left', {
        userId,
      });
    }

    this.logger.log(`User ${userId} disconnected from booking ${bookingId}`);
  }
}

