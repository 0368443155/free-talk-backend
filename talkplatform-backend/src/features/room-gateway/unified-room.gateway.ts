import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRoomGateway } from '../../core/room/gateways/base-room.gateway';
import { RoomFactoryService } from '../../core/room/services/room-factory.service';
import { RoomStateManagerService } from '../../core/room/services/room-state-manager.service';
import { UserSocketManagerService } from '../../core/room/services/user-socket-manager.service';
import { AccessValidatorService } from '../../core/access-control/services/access-validator.service';
import { JoinRoomDto, LeaveRoomDto } from './dto';
import { Meeting } from '../meeting/entities/meeting.entity';
import { MeetingParticipant } from '../meeting/entities/meeting-participant.entity';
import { User } from '../../users/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ParticipantRole, ParticipantState } from '../../core/room/interfaces/room-state.interface';

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
    username?: string;
    meetingId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // 100 MB
})
@Injectable()
export class UnifiedRoomGateway
  extends BaseRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{

  constructor(
    protected readonly roomFactory: RoomFactoryService,
    protected readonly roomStateManager: RoomStateManagerService,
    private readonly userSocketManager: UserSocketManagerService,
    private readonly accessValidator: AccessValidatorService,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super(roomFactory, roomStateManager);
  }

  /**
   * Handle client connection
   */
  async handleConnection(client: SocketWithUser) {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      // Extract user from JWT token or query params
      const user = await this.extractUserFromToken(client);

      if (!user) {
        this.logger.warn(`Unauthorized connection: ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.data.userId = user.id;
      client.data.username = user.username;

      // Track user socket for cross-gateway communication
      await this.userSocketManager.trackUserSocket(user.id, client.id);

      this.logger.log(`User ${user.username} (${user.id}) connected via ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: SocketWithUser) {
    this.logger.log(`Client disconnected: ${client.id}`);

    try {
      const userId = client.data.userId;
      const meetingId = client.data.meetingId;

      // Remove user socket tracking
      if (userId) {
        await this.userSocketManager.removeUserSocket(userId);
      }

      if (userId && meetingId) {
        // Leave room
        await this.handleLeaveRoom(client, { roomId: meetingId });
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Handle room join
   */
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: JoinRoomDto,
  ) {
    try {
      const userId = this.getUserId(client);
      const username = this.getUsername(client);

      if (!userId || !username) {
        throw new WsException('User not authenticated');
      }

      this.logger.log(`User ${username} joining room ${dto.roomId}`);

      // Get meeting from database
      const meeting = await this.meetingRepository.findOne({
        where: { id: dto.roomId },
        relations: ['host', 'settings'],
      });

      if (!meeting) {
        throw new WsException('Room not found');
      }

      // Get room config
      const roomConfig = this.roomFactory.getRoomConfigByType(dto.roomType);

      if (!roomConfig) {
        throw new WsException('Invalid room type');
      }

      // Validate access
      const validationResult = await this.accessValidator.validateRoomAccess(
        userId,
        dto.roomId,
        roomConfig,
      );

      if (!validationResult.granted) {
        throw new WsException(validationResult.reason || 'Access denied');
      }

      // Join socket room
      client.join(dto.roomId);
      client.data.meetingId = dto.roomId;

      // Add participant to room state
      const participantState: ParticipantState = {
        userId,
        username,
        role: dto.isHost || meeting.host.id === userId ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT,
        isOnline: true,
        isMuted: false,
        isVideoOff: false,
        isHandRaised: false,
        isScreenSharing: false,
        joinedAt: new Date(),
        lastActivity: new Date(),
      };
      await this.roomStateManager.addParticipant(dto.roomId, participantState);

      // Get room state
      const roomState = await this.roomStateManager.getRoomState(dto.roomId);
      const participants = roomState
        ? Array.from(roomState.participants.values())
        : [];

      // Notify other participants
      this.broadcastToRoomExcept(dto.roomId, client.id, 'room:user-joined', {
        userId,
        username,
        role: dto.isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT,
        joinedAt: new Date(),
      });

      // Return join info
      return {
        success: true,
        roomId: dto.roomId,
        roomType: dto.roomType,
        roomConfig: {
          features: roomConfig.features,
          maxParticipants: roomConfig.maxParticipants,
        },
        participants,
        isHost: dto.isHost || meeting.host.id === userId,
      };
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      throw new WsException(error.message || 'Failed to join room');
    }
  }

  /**
   * Handle room leave
   */
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: LeaveRoomDto,
  ) {
    try {
      const userId = this.getUserId(client);
      const username = this.getUsername(client);

      if (!userId) {
        throw new WsException('User not authenticated');
      }

      this.logger.log(`User ${username} leaving room ${dto.roomId}`);

      // Leave socket room
      client.leave(dto.roomId);
      client.data.meetingId = undefined;

      // Remove participant from room state
      await this.roomStateManager.removeParticipant(dto.roomId, userId);

      // Notify other participants
      this.broadcastToRoom(dto.roomId, 'room:user-left', {
        userId,
        username,
        leftAt: new Date(),
      });

      return {
        success: true,
        message: 'Left room successfully',
      };
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
      throw new WsException(error.message || 'Failed to leave room');
    }
  }

  /**
   * Get room information
   */
  protected async getRoomInfo(roomId: string): Promise<{
    id: string;
    type: string;
    [key: string]: any;
  }> {
    // Try to get from cache first
    const cached = await this.roomStateManager.getRoomState(roomId);
    if (cached) {
      return { id: roomId, type: cached.roomType };
    }

    // Fallback to database
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
    });

    if (!meeting) {
      throw new Error('Room not found');
    }

    // Map MeetingType to RoomType
    const roomTypeMap: Record<string, string> = {
      FREE_TALK: 'FREE_TALK',
      TEACHER_CLASS: 'TEACHER_CLASS',
      WORKSHOP: 'WEBINAR',
      PRIVATE_SESSION: 'INTERVIEW',
    };

    return {
      id: roomId,
      type: roomTypeMap[meeting.meeting_type] || 'FREE_TALK',
    };
  }

  /**
   * === WEBRTC SIGNALING HANDLERS (CRITICAL FOR P2P CONNECTION) ===
   * These handlers forward WebRTC signaling messages between peers
   */

  @SubscribeMessage('media:offer')
  async handleMediaOffer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; offer: any },
  ) {
    try {
      const fromUserId = this.getUserId(client);
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:offer from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket and forward offer
      // Try default namespace first, then media namespace
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId, 'media');
      }
      
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:offer', {
          fromUserId,
          roomId: data.roomId,
          offer: data.offer,
        });
        this.logger.debug(`Successfully forwarded media:offer to ${data.targetUserId} via socket ${targetSocketId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:offer: ${error.message}`);
    }
  }

  @SubscribeMessage('media:answer')
  async handleMediaAnswer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; answer: any },
  ) {
    try {
      const fromUserId = this.getUserId(client);
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:answer from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket and forward answer
      // Try default namespace first, then media namespace
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId, 'media');
      }
      
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:answer', {
          fromUserId,
          roomId: data.roomId,
          answer: data.answer,
        });
        this.logger.debug(`Successfully forwarded media:answer to ${data.targetUserId} via socket ${targetSocketId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:answer: ${error.message}`);
    }
  }

  @SubscribeMessage('media:ice-candidate')
  async handleMediaCandidate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; roomId: string; candidate: any },
  ) {
    try {
      const fromUserId = this.getUserId(client);
      if (!fromUserId) {
        throw new WsException('User not authenticated');
      }

      this.logger.debug(`Forwarding media:ice-candidate from ${fromUserId} to ${data.targetUserId}`);

      // Find target user's socket and forward ICE candidate
      // Try default namespace first, then media namespace
      let targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (!targetSocketId) {
        targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId, 'media');
      }
      
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:ice-candidate', {
          fromUserId,
          roomId: data.roomId,
          candidate: data.candidate,
        });
        this.logger.debug(`Successfully forwarded media:ice-candidate to ${data.targetUserId} via socket ${targetSocketId}`);
      } else {
        this.logger.warn(`Target user ${data.targetUserId} not found in socket map`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle media:ice-candidate: ${error.message}`);
    }
  }

  @SubscribeMessage('media:ready')
  async handleMediaReady(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const userId = this.getUserId(client);
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      const roomId = data.roomId || client.data.meetingId;
      if (!roomId) {
        throw new WsException('Room ID required');
      }

      this.logger.log(`User ${userId} is ready for WebRTC in room ${roomId}`);

      // Broadcast to all other participants in the room that this user is ready
      this.broadcastToRoomExcept(roomId, client.id, 'media:peer-ready', {
        userId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle media:ready: ${error.message}`);
    }
  }

  /**
   * Handle Media State Updates (Mic/Cam/Screen)
   * V2 Hook cần gọi event này để đồng bộ state với DB/Redis
   */
  @SubscribeMessage('media:state-update')
  async handleMediaStateUpdate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      roomId: string;
      isMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
      isHandRaised?: boolean;
    },
  ) {
    try {
      const userId = this.getUserId(client);
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      const roomId = data.roomId || client.data.meetingId;
      if (!roomId) {
        throw new WsException('Room ID required');
      }

      this.logger.log(`Media state update from user ${userId} in room ${roomId}`, data);

      // 🔥 CRITICAL: Update database first (source of truth for frontend)
      const dbUpdates: Partial<MeetingParticipant> = {};
      if (data.isMuted !== undefined) dbUpdates.is_muted = data.isMuted;
      if (data.isVideoOff !== undefined) dbUpdates.is_video_off = data.isVideoOff;
      // Note: is_screen_sharing and is_hand_raised are not in MeetingParticipant entity

      if (Object.keys(dbUpdates).length > 0) {
        await this.participantRepository.update(
          { meeting: { id: roomId }, user: { id: userId } },
          dbUpdates,
        );
        this.logger.log(`Updated database for user ${userId}:`, dbUpdates);
      }

      // 2. Update state trong Redis/Memory thông qua RoomStateManager
      const updates: Partial<ParticipantState> = {};
      if (data.isMuted !== undefined) updates.isMuted = data.isMuted;
      if (data.isVideoOff !== undefined) updates.isVideoOff = data.isVideoOff;
      if (data.isScreenSharing !== undefined) updates.isScreenSharing = data.isScreenSharing;
      if (data.isHandRaised !== undefined) updates.isHandRaised = data.isHandRaised;

      if (Object.keys(updates).length > 0) {
        await this.roomStateManager.updateParticipant(roomId, userId, updates);
      } else {
        this.logger.warn(`No updates provided for media state update from user ${userId}`);
        return;
      }

      // 2. Broadcast cho tất cả mọi người trong phòng (trừ người gửi) để cập nhật UI ngay lập tức
      // Frontend V2 sẽ hứng event này để cập nhật list participants
      this.broadcastToRoomExcept(roomId, client.id, 'media:participant-state-updated', {
        userId,
        ...data,
      });

      // 3. Also emit to the sender for confirmation (optional)
      client.emit('media:state-updated', {
        success: true,
        ...data,
      });
    } catch (error) {
      this.logger.error(`Media state update failed: ${error.message}`);
      client.emit('media:state-update-error', {
        message: error.message || 'Failed to update media state',
      });
    }
  }

  /**
   * Host moderation controls - Mute participant
   */
  @SubscribeMessage('admin:mute-user')
  async handleAdminMuteUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; mute?: boolean },
  ) {
    try {
      const userId = this.getUserId(client);
      const roomId = client.data.meetingId;
      
      if (!userId || !roomId) {
        throw new WsException('User or room not found');
      }

      // TODO: Verify host permission
      // For now, allow if user is in the room
      
      // Get current state from database (source of truth)
      const participant = await this.participantRepository.findOne({
        where: { meeting: { id: roomId }, user: { id: data.targetUserId } },
      });

      if (!participant) {
        throw new WsException('Participant not found');
      }

      const currentMuted = participant.is_muted || false;
      const isMuted = data.mute !== undefined ? data.mute : !currentMuted;

      // Update database (source of truth)
      await this.participantRepository.update(
        { meeting: { id: roomId }, user: { id: data.targetUserId } },
        { is_muted: isMuted },
      );

      // Also update RoomStateManager for real-time sync
      await this.roomStateManager.updateParticipant(roomId, data.targetUserId, {
        isMuted,
      });

      // Broadcast force mute event to target user
      const targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:user-muted', {
          userId: data.targetUserId,
          isMuted,
        });
      }

      // Broadcast state update to all participants
      this.broadcastToRoom(roomId, 'media:participant-state-updated', {
        userId: data.targetUserId,
        isMuted,
      });

      this.logger.log(`Host ${userId} ${isMuted ? 'muted' : 'unmuted'} user ${data.targetUserId} in room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to handle admin mute: ${error.message}`);
    }
  }

  /**
   * Host moderation controls - Turn off video
   */
  @SubscribeMessage('admin:video-off-user')
  async handleAdminVideoOffUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; videoOff?: boolean },
  ) {
    try {
      const userId = this.getUserId(client);
      const roomId = client.data.meetingId;
      
      if (!userId || !roomId) {
        throw new WsException('User or room not found');
      }

      // TODO: Verify host permission
      
      // Get current state from database (source of truth)
      const participant = await this.participantRepository.findOne({
        where: { meeting: { id: roomId }, user: { id: data.targetUserId } },
      });

      if (!participant) {
        throw new WsException('Participant not found');
      }

      const currentVideoOff = participant.is_video_off || false;
      const isVideoOff = data.videoOff !== undefined ? data.videoOff : !currentVideoOff;

      // Update database (source of truth)
      await this.participantRepository.update(
        { meeting: { id: roomId }, user: { id: data.targetUserId } },
        { is_video_off: isVideoOff },
      );

      // Also update RoomStateManager for real-time sync
      await this.roomStateManager.updateParticipant(roomId, data.targetUserId, {
        isVideoOff,
      });

      // Broadcast force video off event to target user
      const targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:user-video-off', {
          userId: data.targetUserId,
          isVideoOff,
        });
      }

      // Broadcast state update to all participants
      this.broadcastToRoom(roomId, 'media:participant-state-updated', {
        userId: data.targetUserId,
        isVideoOff,
      });

      this.logger.log(`Host ${userId} ${isVideoOff ? 'turned off' : 'turned on'} video for user ${data.targetUserId} in room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to handle admin video off: ${error.message}`);
    }
  }

  /**
   * Host moderation controls - Stop screen share
   */
  @SubscribeMessage('admin:stop-share-user')
  async handleAdminStopShareUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    try {
      const userId = this.getUserId(client);
      const roomId = client.data.meetingId;
      
      if (!userId || !roomId) {
        throw new WsException('User or room not found');
      }

      // TODO: Verify host permission
      
      // Update state
      await this.roomStateManager.updateParticipant(roomId, data.targetUserId, {
        isScreenSharing: false,
      });

      // Broadcast force stop share event to target user
      const targetSocketId = await this.userSocketManager.getUserSocket(data.targetUserId);
      if (targetSocketId) {
        this.sendToClient(targetSocketId, 'media:user-screen-share', {
          userId: data.targetUserId,
          isSharing: false,
        });
      }

      // Broadcast state update to all participants
      this.broadcastToRoom(roomId, 'media:participant-state-updated', {
        userId: data.targetUserId,
        isScreenSharing: false,
      });

      this.logger.log(`Host ${userId} stopped screen share for user ${data.targetUserId} in room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to handle admin stop share: ${error.message}`);
    }
  }

  /**
   * Extract user from JWT token
   */
  private async extractUserFromToken(
    client: SocketWithUser,
  ): Promise<User | null> {
    try {
      // Try to get token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Try to get userId from query params (for development)
        const userId = client.handshake.query?.userId as string;
        if (userId) {
          const user = await this.userRepository.findOne({
            where: { id: userId },
          });
          return user;
        }
        return null;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (!payload || !payload.sub) {
        return null;
      }

      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      return user;
    } catch (error) {
      this.logger.error(`Token extraction error: ${error.message}`);
      return null;
    }
  }
}

