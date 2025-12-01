import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { WaitingRoomService } from '../services/waiting-room.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/waiting-room',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class WaitingRoomGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WaitingRoomGateway.name);

  constructor(
    private readonly waitingRoomService: WaitingRoomService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('waiting-room:join')
  async handleJoinWaitingRoom(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.user) {
      return;
    }

    try {
      // Check if room has waiting room feature
      const hasFeature = await this.baseRoomService.hasFeature(
        client.meetingId,
        RoomFeature.WAITING_ROOM,
      );
      if (!hasFeature) {
        client.emit('waiting-room:error', {
          message: 'Waiting room is disabled in this room',
        });
        return;
      }

      await this.waitingRoomService.addToWaitingRoom(
        client.meetingId,
        client.user,
        client.id,
      );

      // Notify host
      this.server.to(`host:${client.meetingId}`).emit('waiting-room:participant-joined', {
        userId: client.user.id,
        username: client.user.username,
        joinedAt: new Date(),
      });

      // Notify participant
      client.emit('waiting-room:joined', {
        message: 'You are in the waiting room. Please wait for host approval.',
      });
    } catch (error) {
      this.logger.error(`Error joining waiting room:`, error);
      client.emit('waiting-room:error', {
        message: error instanceof Error ? error.message : 'Failed to join waiting room',
      });
    }
  }

  @SubscribeMessage('waiting-room:admit')
  async handleAdmitParticipant(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const participant = await this.waitingRoomService.admitParticipant(
        client.meetingId,
        data.targetUserId,
        client.userId,
      );

      if (participant && participant.socketId) {
        // Notify admitted participant
        this.server.to(participant.socketId).emit('waiting-room:admitted', {
          message: 'You have been admitted to the meeting',
        });
      }

      // Notify host
      this.server.to(`host:${client.meetingId}`).emit('waiting-room:participant-admitted', {
        userId: data.targetUserId,
        username: participant?.username,
      });
    } catch (error) {
      this.logger.error(`Error admitting participant:`, error);
      client.emit('waiting-room:error', {
        message: error instanceof Error ? error.message : 'Failed to admit participant',
      });
    }
  }

  @SubscribeMessage('waiting-room:deny')
  async handleDenyParticipant(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const participant = await this.waitingRoomService.denyParticipant(
        client.meetingId,
        data.targetUserId,
        client.userId,
      );

      if (participant && participant.socketId) {
        // Notify denied participant
        this.server.to(participant.socketId).emit('waiting-room:denied', {
          message: 'Your entry request has been denied',
        });
      }

      // Notify host
      this.server.to(`host:${client.meetingId}`).emit('waiting-room:participant-denied', {
        userId: data.targetUserId,
        username: participant?.username,
      });
    } catch (error) {
      this.logger.error(`Error denying participant:`, error);
      client.emit('waiting-room:error', {
        message: error instanceof Error ? error.message : 'Failed to deny participant',
      });
    }
  }

  @SubscribeMessage('waiting-room:list')
  async handleGetWaitingList(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const participants = this.waitingRoomService.getWaitingParticipants(client.meetingId);
      const stats = this.waitingRoomService.getWaitingRoomStats(client.meetingId);

      client.emit('waiting-room:list', {
        participants,
        stats,
      });
    } catch (error) {
      this.logger.error(`Error getting waiting list:`, error);
      client.emit('waiting-room:error', {
        message: 'Failed to get waiting list',
      });
    }
  }
}

