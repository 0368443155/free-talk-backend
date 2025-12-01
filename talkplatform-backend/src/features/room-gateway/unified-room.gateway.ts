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
import { AccessValidatorService } from '../../core/access-control/services/access-validator.service';
import { JoinRoomDto, LeaveRoomDto } from './dto';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
  private readonly logger = new Logger(UnifiedRoomGateway.name);

  constructor(
    protected readonly roomFactory: RoomFactoryService,
    protected readonly roomStateManager: RoomStateManagerService,
    private readonly accessValidator: AccessValidatorService,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
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
      await this.roomStateManager.addParticipant(dto.roomId, {
        userId,
        username,
        role: dto.isHost || meeting.host.id === userId ? 'host' : 'participant',
        isOnline: true,
        joinedAt: new Date(),
      });

      // Get room state
      const roomState = await this.roomStateManager.getRoomState(dto.roomId);
      const participants = roomState
        ? Array.from(roomState.participants.values())
        : [];

      // Notify other participants
      this.broadcastToRoomExcept(dto.roomId, client.id, 'room:user-joined', {
        userId,
        username,
        role: dto.isHost ? 'host' : 'participant',
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

