import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { KickUserService } from '../services/kick-user.service';
import { BlockUserService } from '../services/block-user.service';
import { RoomLockService } from '../services/room-lock.service';
import { MuteControlService } from '../services/mute-control.service';
import { ModerationLogService } from '../services/moderation-log.service';
import { ModerationActionType } from '../interfaces/moderation-action.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/moderation',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class ModerationGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ModerationGateway.name);

  constructor(
    private readonly kickUserService: KickUserService,
    private readonly blockUserService: BlockUserService,
    private readonly roomLockService: RoomLockService,
    private readonly muteControlService: MuteControlService,
    private readonly moderationLogService: ModerationLogService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('admin:kick-user')
  async handleKickUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; reason?: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.kickUserService.kickUser(
        client.meetingId,
        data.targetUserId,
        client.userId,
        data.reason,
      );

      // Log action
      this.moderationLogService.logAction(
        client.meetingId,
        ModerationActionType.KICK,
        data.targetUserId,
        client.userId,
        data.reason,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('user:kicked', {
        userId: data.targetUserId,
        reason: data.reason || 'Kicked by host',
        timestamp: new Date(),
      });

      // Notify kicked user
      this.server.emit('user:kicked', {
        userId: data.targetUserId,
        roomId: client.meetingId,
        reason: data.reason || 'Kicked by host',
      });
    } catch (error) {
      this.logger.error(`Error kicking user:`, error);
      client.emit('moderation:error', {
        message: error instanceof Error ? error.message : 'Failed to kick user',
      });
    }
  }

  @SubscribeMessage('admin:block-user')
  async handleBlockUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; reason?: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.blockUserService.blockUser(
        client.meetingId,
        data.targetUserId,
        client.userId,
        data.reason,
      );

      // Log action
      this.moderationLogService.logAction(
        client.meetingId,
        ModerationActionType.BLOCK,
        data.targetUserId,
        client.userId,
        data.reason,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('user:blocked', {
        userId: data.targetUserId,
        reason: data.reason || 'Blocked by host',
        timestamp: new Date(),
      });

      // Notify blocked user
      this.server.emit('user:blocked', {
        userId: data.targetUserId,
        roomId: client.meetingId,
        reason: data.reason || 'Blocked by host',
      });
    } catch (error) {
      this.logger.error(`Error blocking user:`, error);
      client.emit('moderation:error', {
        message: error instanceof Error ? error.message : 'Failed to block user',
      });
    }
  }

  @SubscribeMessage('admin:lock-room')
  async handleLockRoom(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.roomLockService.lockRoom(client.meetingId, client.userId);

      // Log action
      this.moderationLogService.logAction(
        client.meetingId,
        ModerationActionType.ROOM_LOCK,
        '',
        client.userId,
        'Room locked by host',
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('room:locked', {
        locked: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error locking room:`, error);
      client.emit('moderation:error', {
        message: error instanceof Error ? error.message : 'Failed to lock room',
      });
    }
  }

  @SubscribeMessage('admin:unlock-room')
  async handleUnlockRoom(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.roomLockService.unlockRoom(client.meetingId, client.userId);

      // Log action
      this.moderationLogService.logAction(
        client.meetingId,
        ModerationActionType.ROOM_UNLOCK,
        '',
        client.userId,
        'Room unlocked by host',
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('room:unlocked', {
        locked: false,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error unlocking room:`, error);
      client.emit('moderation:error', {
        message: error instanceof Error ? error.message : 'Failed to unlock room',
      });
    }
  }

  @SubscribeMessage('moderation:logs')
  async handleGetLogs(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { limit?: number },
  ) {
    if (!client.meetingId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const logs = this.moderationLogService.getLogs(
        client.meetingId,
        data.limit || 100,
      );

      client.emit('moderation:logs', { logs });
    } catch (error) {
      this.logger.error(`Error getting moderation logs:`, error);
      client.emit('moderation:error', {
        message: 'Failed to get moderation logs',
      });
    }
  }
}

