import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LiveKitService, LiveKitTokenRequest } from './livekit.service';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { Account } from '../core/auth/decorators/account.decorator';
import { User, UserRole } from '../users/user.entity';
import { MeetingsService } from '../features/meeting/meetings.service';
import { ParticipantRole } from '../features/meeting/entities/meeting-participant.entity';
import { GenerateTokenDto, GenerateBotTokenDto, AdmitParticipantDto, ValidateTokenDto } from './dto/livekit-token.dto';

@ApiTags('LiveKit')
@Controller('livekit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveKitController {
  private readonly logger = new Logger(LiveKitController.name);

  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly meetingsService: MeetingsService,
  ) {}

  /**
   * UC-01: Primary token endpoint - Dynamic Token Generation
   * Generates LiveKit access token based on meeting context and user permissions
   */
  @Post('token')
  @ApiOperation({ 
    summary: 'Generate LiveKit access token for meeting',
    description: 'Creates JWT token with video grants based on user role and meeting permissions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token generated successfully',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'JWT access token for LiveKit' },
        wsUrl: { type: 'string', description: 'WebSocket URL to connect to LiveKit' },
        identity: { type: 'string', description: 'User identity in LiveKit room' },
        room: { type: 'string', description: 'LiveKit room name' },
        metadata: { type: 'object', description: 'User metadata and permissions' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiResponse({ status: 403, description: 'Access denied to meeting' })
  async generateToken(
    @Body() dto: GenerateTokenDto,
    @Account() user: User,
  ) {
    try {
      // 1. Verify meeting exists and user has access
      const meeting = await this.meetingsService.findOne(dto.meetingId, user);
      
      if (!meeting) {
        throw new HttpException('Meeting not found or access denied', HttpStatus.NOT_FOUND);
      }

      // 2. Check if meeting is locked and user is not authorized
      if (meeting.is_locked && meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
        throw new HttpException('Meeting is locked', HttpStatus.FORBIDDEN);
      }

      // 3. Determine user role in meeting context
      const isHost = meeting.host.id === user.id;
      const isModerator = user.role === UserRole.ADMIN; // Admin always has moderator privileges
      
      // Check if user is existing participant with specific role
      const existingParticipant = meeting.participants?.find(p => p.user.id === user.id);
      const participantRole = existingParticipant?.role || (isHost ? 'host' : 'participant');

      // 4. Build metadata with business context (UC-01)
      const metadata = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: participantRole,
        userRole: user.role, // System role (ADMIN, TEACHER, STUDENT)
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        isHost,
        isModerator,
        // Organization context (for enterprise features)
        orgUnit: 'default', // TODO: Add org structure
        joinedAt: new Date().toISOString(),
        // Meeting-specific permissions
        permissions: {
          canModerate: isHost || isModerator,
          canRecord: isHost && meeting.settings?.record_meeting,
          canManageWaitingRoom: isHost && meeting.settings?.waiting_room,
          canKickParticipants: isHost || isModerator,
          canMuteOthers: isHost || isModerator,
        }
      };

      // 5. Generate appropriate token based on context
      let token: string;
      const room = `meeting-${meeting.id}`; // LiveKit room naming convention
      const identity = `user-${user.id}`; // Unique identity for LiveKit
      const name = user.username || user.email;
      const metadataJson = JSON.stringify(metadata);

      // Handle waiting room logic (UC-03)
      if (meeting.settings?.waiting_room && !isHost && !isModerator && dto.participantRole !== 'waiting') {
        // Check if user is already admitted (implementation depends on your waiting room state management)
        const isAdmitted = false; // TODO: Check admission status from cache/database
        
        if (!isAdmitted) {
          token = await this.liveKitService.generateWaitingRoomToken(
            room, identity, name, metadataJson
          );
          
          this.logger.log(`Generated waiting room token for ${identity} in meeting ${meeting.id}`);
          
          return {
            token,
            wsUrl: this.liveKitService.getWebSocketUrl(),
            identity,
            room,
            metadata,
            waitingRoom: true,
            message: 'You are in the waiting room. The host will admit you shortly.'
          };
        }
      }

      // Generate token based on role
      if (isHost) {
        token = await this.liveKitService.generateHostToken(
          room, identity, name, metadataJson
        );
      } else {
        token = await this.liveKitService.generateParticipantToken(
          room, identity, name, metadataJson
        );
      }

      this.logger.log(`Generated ${participantRole} token for ${identity} in meeting ${meeting.id}`);

      return {
        token,
        wsUrl: this.liveKitService.getWebSocketUrl(),
        identity,
        room,
        metadata,
        waitingRoom: false,
      };

    } catch (error) {
      this.logger.error(`Failed to generate token for meeting ${dto.meetingId}:`, error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate access token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * UC-01: Generate token for non-human actors (AI agents, bots)
   * Support for AI integration and automated participants
   */
  @Post('bot-token')
  @ApiOperation({ 
    summary: 'Generate token for AI agents and bots',
    description: 'Creates specialized tokens for automated participants like recording bots, AI assistants'
  })
  async generateBotToken(
    @Body() dto: GenerateBotTokenDto,
    @Account() user: User,
  ) {
    try {
      // Only hosts and admins can create bot tokens
      const meeting = await this.meetingsService.findOne(dto.meetingId, user);
      
      const isHost = meeting.host.id === user.id;
      const isAdmin = user.role === UserRole.ADMIN;
      
      if (!isHost && !isAdmin) {
        throw new HttpException('Only hosts can create bot tokens', HttpStatus.FORBIDDEN);
      }

      const room = `meeting-${meeting.id}`;
      const botIdentity = `bot-${dto.botType || 'assistant'}-${Date.now()}`;
      const botName = dto.botName || `${dto.botType || 'Assistant'} Bot`;

      let token: string;

      // Generate specialized token based on bot type
      switch (dto.botType) {
        case 'recorder':
          token = await this.liveKitService.generateRecorderToken(room, botIdentity);
          break;
        
        case 'assistant':
        case 'transcriber':
        default:
          token = await this.liveKitService.generateBotToken(room, botIdentity, botName);
          break;
      }

      this.logger.log(`Generated ${dto.botType} bot token for meeting ${meeting.id}`);

      return {
        token,
        wsUrl: this.liveKitService.getWebSocketUrl(),
        identity: botIdentity,
        room,
        botType: dto.botType,
        botName,
      };

    } catch (error) {
      this.logger.error(`Failed to generate bot token:`, error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate bot token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Refresh existing token (extend TTL)
   * Useful for long meetings
   */
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh existing token to extend session' })
  async refreshToken(
    @Body() dto: GenerateTokenDto,
    @Account() user: User,
  ) {
    // Re-generate token with fresh TTL
    // Same logic as generateToken but with explicit refresh context
    return this.generateToken(dto, user);
  }

  /**
   * Get LiveKit connection info without generating token
   * Useful for checking service availability
   */
  @Get('connection-info')
  @ApiOperation({ summary: 'Get LiveKit connection information' })
  getConnectionInfo() {
    return {
      wsUrl: this.liveKitService.getWebSocketUrl(),
      available: true,
      version: '1.0.0',
    };
  }

  /**
   * Validate existing token (debugging/testing endpoint)
   */
  @Post('validate-token')
  @ApiOperation({ summary: 'Validate LiveKit token (debug/testing)' })
  async validateToken(@Body('token') token: string) {
    try {
      const decoded = await this.liveKitService.validateToken(token);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * UC-03: Waiting room management - Admit participant
   * Called by host to admit participant from waiting room
   */
  @Post('admit-participant')
  @ApiOperation({ summary: 'Admit participant from waiting room' })
  async admitParticipant(
    @Body() body: { meetingId: string; participantId: string },
    @Account() user: User,
  ) {
    try {
      const meeting = await this.meetingsService.findOne(body.meetingId, user);
      
      // Only host can admit participants
      if (meeting.host.id !== user.id) {
        throw new HttpException('Only host can admit participants', HttpStatus.FORBIDDEN);
      }

      // TODO: Update participant status in waiting room state
      // This would typically involve:
      // 1. Mark participant as admitted in cache/database
      // 2. Emit event to participant to rejoin with full permissions
      // 3. Generate new token with full permissions

      const room = `meeting-${meeting.id}`;
      const identity = `user-${body.participantId}`;
      
      // Generate new token with full participant permissions
      const token = await this.liveKitService.generateParticipantToken(
        room,
        identity,
        'Admitted User', // Will be replaced with actual user data
        JSON.stringify({ admitted: true, admittedBy: user.id, admittedAt: new Date().toISOString() })
      );

      this.logger.log(`Admitted participant ${body.participantId} to meeting ${body.meetingId}`);

      return {
        admitted: true,
        token,
        wsUrl: this.liveKitService.getWebSocketUrl(),
        identity,
        room,
      };

    } catch (error) {
      this.logger.error(`Failed to admit participant:`, error.message);
      throw new HttpException('Failed to admit participant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}