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
import { AudioControlService } from '../services/audio-control.service';
import { VideoControlService } from '../services/video-control.service';
import { ScreenShareService } from '../services/screen-share.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { BaseRoomGateway } from '../../../../core/room/gateways/base-room.gateway';
import { RoomStateManagerService } from '../../../../core/room/services/room-state-manager.service';
import { RoomFactoryService } from '../../../../core/room/services/room-factory.service';
import { UserSocketManagerService } from '../../../../core/room/services/user-socket-manager.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../../meeting/entities/meeting.entity';

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
    username?: string;
    roomId?: string;
  };
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
export class MediaGateway extends BaseRoomGateway {
  @WebSocketServer()
  declare server: Server;

  // Peer connection tracking
  private peerConnectionMap = new Map<string, Set<string>>();

  constructor(
    roomFactory: RoomFactoryService,
    roomStateManager: RoomStateManagerService,
    private readonly userSocketManager: UserSocketManagerService,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly audioControl: AudioControlService,
    private readonly videoControl: VideoControlService,
    private readonly screenShare: ScreenShareService,
    private readonly baseRoomService: BaseRoomService,
  ) {
    super(roomFactory, roomStateManager);
  }

  /**
   * Get room info for BaseRoomGateway
   */
  protected async getRoomInfo(roomId: string): Promise<{
    id: string;
    type: string;
    [key: string]: any;
  }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      select: ['id', 'meeting_type'],
    });

    if (!meeting) {
      throw new Error(`Room ${roomId} not found`);
    }

    return {
      id: meeting.id,
      type: meeting.meeting_type,
    };
  }

  /**
   * Track user socket connection (called from UnifiedRoomGateway)
   */
  async trackUserSocket(userId: string, socketId: string): Promise<void> {
    await this.userSocketManager.trackUserSocket(userId, socketId, 'media');
  }

  /**
   * Remove user socket tracking (called from UnifiedRoomGateway)
   */
  async removeUserSocket(userId: string): Promise<void> {
    await this.userSocketManager.removeUserSocket(userId, 'media');
    this.peerConnectionMap.delete(userId);
  }

  /**
   * Send message to specific user by userId
   */
  private async sendToUser(userId: string, event: string, data: any): Promise<void> {
    // Try media namespace first
    let socketId = await this.userSocketManager.getUserSocket(userId, 'media');
    
    // Fallback to main namespace if not found
    if (!socketId) {
      socketId = await this.userSocketManager.getUserSocket(userId);
    }

    if (socketId) {
      this.server.to(socketId).emit(event, data);
    } else {
      this.logger.warn(`User ${userId} not found in socket map`);
    }
  }

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

  /**
   * Handle WebRTC offer
   * Migrated from: webrtc:offer
   */
  @SubscribeMessage('media:offer')
  async handleOffer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      offer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      const userId = client.data?.userId || client.userId;
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Validate feature enabled
      const hasMedia = await this.hasFeature(data.roomId, RoomFeature.VIDEO);
      if (!hasMedia) {
        throw new WsException('Media is disabled in this room');
      }

      // Track peer connection
      const userPeers = this.peerConnectionMap.get(userId) || new Set();
      userPeers.add(data.targetUserId);
      this.peerConnectionMap.set(userId, userPeers);

      // Forward offer to target user
      await this.sendToUser(data.targetUserId, 'media:offer', {
        fromUserId: userId,
        roomId: data.roomId,
        offer: data.offer,
      });

      this.logger.debug(`WebRTC offer sent from ${userId} to ${data.targetUserId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Offer error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle WebRTC answer
   * Migrated from: webrtc:answer
   */
  @SubscribeMessage('media:answer')
  async handleAnswer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      answer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      const userId = client.data?.userId || client.userId;
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Track peer connection
      const userPeers = this.peerConnectionMap.get(userId) || new Set();
      userPeers.add(data.targetUserId);
      this.peerConnectionMap.set(userId, userPeers);

      // Forward answer to target user
      await this.sendToUser(data.targetUserId, 'media:answer', {
        fromUserId: userId,
        roomId: data.roomId,
        answer: data.answer,
      });

      this.logger.debug(`WebRTC answer sent from ${userId} to ${data.targetUserId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Answer error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle ICE candidate
   * Migrated from: webrtc:ice-candidate
   */
  @SubscribeMessage('media:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    try {
      const userId = client.data?.userId || client.userId;
      if (!userId) {
        return; // Silently fail for ICE candidates to avoid spam
      }

      // Forward ICE candidate to target user
      await this.sendToUser(data.targetUserId, 'media:ice-candidate', {
        fromUserId: userId,
        roomId: data.roomId,
        candidate: data.candidate,
      });
    } catch (error) {
      // Silently fail for ICE candidates (they're frequent and non-critical)
      this.logger.debug(`ICE candidate error: ${error.message}`);
    }
  }

  /**
   * Handle WebRTC ready
   * Migrated from: webrtc:ready
   */
  @SubscribeMessage('media:ready')
  async handleReady(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = client.data?.userId || client.userId;
      if (!userId || !data.roomId) {
        return;
      }

      this.logger.debug(`User ${userId} is ready for WebRTC in room ${data.roomId}`);

      // Notify all others in the room
      this.broadcastToRoomExcept(data.roomId, client.id, 'media:peer-ready', {
        userId,
        roomId: data.roomId,
      });
    } catch (error) {
      this.logger.error(`Ready error: ${error.message}`);
    }
  }
}

