import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { HandRaiseService } from '../services/hand-raise.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/hand-raise',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class HandRaiseGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HandRaiseGateway.name);

  constructor(
    private readonly handRaiseService: HandRaiseService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('hand:raise')
  async handleRaiseHand(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.userId || !client.user) {
      return;
    }

    try {
      // Check if room has hand raise feature
      const hasFeature = await this.baseRoomService.hasFeature(
        client.meetingId,
        RoomFeature.HAND_RAISE,
      );
      if (!hasFeature) {
        client.emit('hand:error', { message: 'Hand raise is disabled in this room' });
        return;
      }

      await this.handRaiseService.raiseHand(
        client.meetingId,
        client.userId,
        client.user.username,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('hand:raised', {
        userId: client.userId,
        userName: client.user.username,
      });
    } catch (error) {
      this.logger.error(`Error raising hand:`, error);
      client.emit('hand:error', {
        message: error instanceof Error ? error.message : 'Failed to raise hand',
      });
    }
  }

  @SubscribeMessage('hand:lower')
  async handleLowerHand(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.handRaiseService.lowerHand(client.meetingId, client.userId);

      // Broadcast to room
      this.server.to(client.meetingId).emit('hand:lowered', {
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error lowering hand:`, error);
      client.emit('hand:error', {
        message: error instanceof Error ? error.message : 'Failed to lower hand',
      });
    }
  }

  @SubscribeMessage('hand:acknowledge')
  async handleAcknowledge(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      await this.handRaiseService.acknowledgeHandRaise(
        client.meetingId,
        data.targetUserId,
        client.userId,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('hand:acknowledged', {
        userId: data.targetUserId,
        acknowledgedBy: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error acknowledging hand raise:`, error);
      client.emit('hand:error', {
        message: error instanceof Error ? error.message : 'Failed to acknowledge hand raise',
      });
    }
  }

  @SubscribeMessage('hand:queue')
  async handleGetQueue(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) {
      return;
    }

    try {
      const queue = await this.handRaiseService.getRaisedHands(client.meetingId);
      client.emit('hand:queue', { queue });
    } catch (error) {
      this.logger.error(`Error getting hand raise queue:`, error);
      client.emit('hand:error', {
        message: 'Failed to get hand raise queue',
      });
    }
  }
}

