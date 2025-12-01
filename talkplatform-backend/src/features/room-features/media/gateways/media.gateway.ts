import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { AudioControlService } from '../services/audio-control.service';
import { VideoControlService } from '../services/video-control.service';
import { ScreenShareService } from '../services/screen-share.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/media',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class MediaGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediaGateway.name);

  constructor(
    private readonly audioControl: AudioControlService,
    private readonly videoControl: VideoControlService,
    private readonly screenShare: ScreenShareService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('media:toggle-mic')
  async handleToggleMic(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isMuted: boolean },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.audioControl.toggleMic(client.meetingId, client.userId, data.isMuted);

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-muted', {
        userId: client.userId,
        isMuted: data.isMuted,
      });
    } catch (error) {
      this.logger.error(`Error toggling mic:`, error);
      client.emit('media:error', { message: 'Failed to toggle microphone' });
    }
  }

  @SubscribeMessage('media:toggle-video')
  async handleToggleVideo(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isVideoOff: boolean },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.videoControl.toggleVideo(client.meetingId, client.userId, data.isVideoOff);

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-video-off', {
        userId: client.userId,
        isVideoOff: data.isVideoOff,
      });
    } catch (error) {
      this.logger.error(`Error toggling video:`, error);
      client.emit('media:error', { message: 'Failed to toggle video' });
    }
  }

  @SubscribeMessage('media:screen-share')
  async handleScreenShare(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isSharing: boolean },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      if (data.isSharing) {
        await this.screenShare.startScreenShare(client.meetingId, client.userId);
      } else {
        await this.screenShare.stopScreenShare(client.meetingId, client.userId);
      }

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-screen-share', {
        userId: client.userId,
        isSharing: data.isSharing,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error handling screen share:`, error);
      client.emit('media:error', {
        message: error instanceof Error ? error.message : 'Failed to handle screen share',
      });
    }
  }

  @SubscribeMessage('admin:mute-user')
  async handleAdminMuteUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; mute?: boolean },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const currentMuted = await this.audioControl.getMuteState(
        client.meetingId,
        data.targetUserId,
      );
      const isMuted = data.mute !== undefined ? data.mute : !currentMuted;

      await this.audioControl.toggleMic(client.meetingId, data.targetUserId, isMuted);

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-muted', {
        userId: data.targetUserId,
        isMuted,
      });
    } catch (error) {
      this.logger.error(`Error admin muting user:`, error);
    }
  }

  @SubscribeMessage('admin:video-off-user')
  async handleAdminVideoOffUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; videoOff?: boolean },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      const currentVideoOff = await this.videoControl.getVideoState(
        client.meetingId,
        data.targetUserId,
      );
      const isVideoOff = data.videoOff !== undefined ? data.videoOff : !currentVideoOff;

      await this.videoControl.toggleVideo(client.meetingId, data.targetUserId, isVideoOff);

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-video-off', {
        userId: data.targetUserId,
        isVideoOff,
      });
    } catch (error) {
      this.logger.error(`Error admin turning off video:`, error);
    }
  }

  @SubscribeMessage('admin:stop-share-user')
  async handleAdminStopShareUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    // TODO: Add host permission check
    try {
      await this.screenShare.forceStopScreenShare(client.meetingId, data.targetUserId);

      // Broadcast to room
      this.server.to(client.meetingId).emit('media:user-screen-share', {
        userId: data.targetUserId,
        isSharing: false,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error admin stopping screen share:`, error);
    }
  }
}

