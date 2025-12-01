import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { YouTubeSyncService } from '../services/youtube-sync.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/youtube',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class YouTubeSyncGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(YouTubeSyncGateway.name);

  constructor(
    private readonly youtubeSync: YouTubeSyncService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('youtube:play')
  async handlePlay(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { videoId?: string; currentTime: number },
  ) {
    if (!client.meetingId) {
      return;
    }

    try {
      // Check if room has YouTube sync feature
      const hasFeature = await this.baseRoomService.hasFeature(
        client.meetingId,
        RoomFeature.YOUTUBE_SYNC,
      );
      if (!hasFeature) {
        client.emit('youtube:error', { message: 'YouTube sync is disabled in this room' });
        return;
      }

      const state = await this.youtubeSync.play(
        client.meetingId,
        data.videoId || '',
        data.currentTime,
        client.userId,
      );

      // Broadcast to all participants
      this.server.to(client.meetingId).emit('youtube:play', {
        videoId: state.videoId,
        currentTime: state.currentTime,
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error handling YouTube play:`, error);
      client.emit('youtube:error', {
        message: error instanceof Error ? error.message : 'Failed to play video',
      });
    }
  }

  @SubscribeMessage('youtube:pause')
  async handlePause(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { currentTime: number },
  ) {
    if (!client.meetingId) {
      return;
    }

    try {
      const state = await this.youtubeSync.pause(
        client.meetingId,
        data.currentTime,
        client.userId,
      );

      // Broadcast to all participants
      this.server.to(client.meetingId).emit('youtube:pause', {
        currentTime: state.currentTime,
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error handling YouTube pause:`, error);
      client.emit('youtube:error', {
        message: error instanceof Error ? error.message : 'Failed to pause video',
      });
    }
  }

  @SubscribeMessage('youtube:seek')
  async handleSeek(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { currentTime: number },
  ) {
    if (!client.meetingId) {
      return;
    }

    try {
      const state = await this.youtubeSync.seek(
        client.meetingId,
        data.currentTime,
        client.userId,
      );

      // Broadcast to all participants
      this.server.to(client.meetingId).emit('youtube:seek', {
        currentTime: state.currentTime,
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error handling YouTube seek:`, error);
      client.emit('youtube:error', {
        message: error instanceof Error ? error.message : 'Failed to seek video',
      });
    }
  }

  @SubscribeMessage('youtube:clear')
  async handleClear(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) {
      return;
    }

    try {
      await this.youtubeSync.clear(client.meetingId, client.userId);

      // Broadcast to all participants (excluding sender)
      client.to(client.meetingId).emit('youtube:clear');
    } catch (error) {
      this.logger.error(`Error handling YouTube clear:`, error);
      client.emit('youtube:error', {
        message: error instanceof Error ? error.message : 'Failed to clear video',
      });
    }
  }

  @SubscribeMessage('youtube:sync')
  async handleSync(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) {
      return;
    }

    try {
      const state = await this.youtubeSync.getState(client.meetingId);

      // Send current state to client
      client.emit('youtube:sync', {
        videoId: state.videoId,
        currentTime: state.currentTime,
        isPlaying: state.isPlaying,
      });
    } catch (error) {
      this.logger.error(`Error syncing YouTube state:`, error);
      client.emit('youtube:error', {
        message: 'Failed to sync YouTube state',
      });
    }
  }
}

