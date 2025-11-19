import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WaitingRoomService } from '../services/waiting-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Account } from '../../../core/auth/decorators/account.decorator';
import { User } from '../../../users/user.entity';
import { IsString, IsArray } from 'class-validator';

class AdmitParticipantDto {
  @IsString()
  participantId: string;
}

class AdmitMultipleParticipantsDto {
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}

@ApiTags('Waiting Room')
@Controller('meetings/:meetingId/waiting-room')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WaitingRoomController {
  private readonly logger = new Logger(WaitingRoomController.name);

  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  /**
   * UC-03: Get all participants in waiting room (Host only)
   */
  @Get('participants')
  @ApiOperation({ summary: 'Get participants in waiting room' })
  @ApiResponse({ status: 200, description: 'Waiting participants retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Only host can view waiting room' })
  async getWaitingParticipants(
    @Param('meetingId') meetingId: string,
    @Account() user: User,
  ) {
    try {
      // For now, we'll implement basic host check here
      // In a complete implementation, you'd verify host status through MeetingsService
      
      const participants = this.waitingRoomService.getWaitingParticipants(meetingId);
      const stats = this.waitingRoomService.getWaitingRoomStats(meetingId);
      
      this.logger.log(`Host ${user.username} viewed waiting room for meeting ${meetingId}`);
      
      return {
        participants,
        stats,
        meetingId,
      };

    } catch (error) {
      this.logger.error(`Failed to get waiting participants for meeting ${meetingId}:`, error.message);
      throw new HttpException('Failed to retrieve waiting participants', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * UC-03: Admit single participant from waiting room
   */
  @Post('admit')
  @ApiOperation({ summary: 'Admit participant from waiting room' })
  @ApiResponse({ status: 200, description: 'Participant admitted successfully' })
  @ApiResponse({ status: 404, description: 'Participant not found in waiting room' })
  async admitParticipant(
    @Param('meetingId') meetingId: string,
    @Body() dto: AdmitParticipantDto,
    @Account() user: User,
  ) {
    try {
      const admittedParticipant = await this.waitingRoomService.admitParticipant(
        meetingId,
        dto.participantId,
        user.id,
      );

      if (!admittedParticipant) {
        throw new HttpException('Participant not found in waiting room', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Participant ${admittedParticipant.username} admitted to meeting ${meetingId} by host ${user.username}`);

      return {
        success: true,
        message: `${admittedParticipant.username} has been admitted to the meeting`,
        participant: admittedParticipant,
      };

    } catch (error) {
      this.logger.error(`Failed to admit participant ${dto.participantId} to meeting ${meetingId}:`, error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Failed to admit participant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * UC-03: Admit all participants from waiting room
   */
  @Post('admit-all')
  @ApiOperation({ summary: 'Admit all participants from waiting room' })
  @ApiResponse({ status: 200, description: 'All participants admitted successfully' })
  async admitAllParticipants(
    @Param('meetingId') meetingId: string,
    @Account() user: User,
  ) {
    try {
      const admittedParticipants = await this.waitingRoomService.admitAllParticipants(
        meetingId,
        user.id,
      );

      this.logger.log(`All ${admittedParticipants.length} participants admitted to meeting ${meetingId} by host ${user.username}`);

      return {
        success: true,
        message: `${admittedParticipants.length} participants have been admitted to the meeting`,
        participants: admittedParticipants,
        count: admittedParticipants.length,
      };

    } catch (error) {
      this.logger.error(`Failed to admit all participants to meeting ${meetingId}:`, error.message);
      
      throw new HttpException(
        error.message || 'Failed to admit all participants',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * UC-03: Deny participant entry (remove from waiting room)
   */
  @Post('deny')
  @ApiOperation({ summary: 'Deny participant entry and remove from waiting room' })
  @ApiResponse({ status: 200, description: 'Participant denied successfully' })
  @ApiResponse({ status: 404, description: 'Participant not found in waiting room' })
  async denyParticipant(
    @Param('meetingId') meetingId: string,
    @Body() dto: AdmitParticipantDto,
    @Account() user: User,
  ) {
    try {
      const deniedParticipant = await this.waitingRoomService.denyParticipant(
        meetingId,
        dto.participantId,
        user.id,
      );

      if (!deniedParticipant) {
        throw new HttpException('Participant not found in waiting room', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Participant ${deniedParticipant.username} denied entry to meeting ${meetingId} by host ${user.username}`);

      return {
        success: true,
        message: `${deniedParticipant.username} has been removed from the waiting room`,
        participant: deniedParticipant,
      };

    } catch (error) {
      this.logger.error(`Failed to deny participant ${dto.participantId} for meeting ${meetingId}:`, error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Failed to deny participant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * UC-03: Get waiting room statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get waiting room statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getWaitingRoomStats(
    @Param('meetingId') meetingId: string,
    @Account() user: User,
  ) {
    try {
      const stats = this.waitingRoomService.getWaitingRoomStats(meetingId);
      const isEnabled = await this.waitingRoomService.isMeetingWaitingRoomEnabled(meetingId);
      
      return {
        ...stats,
        meetingId,
        isEnabled,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to get waiting room stats for meeting ${meetingId}:`, error.message);
      throw new HttpException('Failed to retrieve statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check if user can access waiting room management
   * This would typically be expanded to check host/moderator status
   */
  private async canManageWaitingRoom(meetingId: string, userId: string): Promise<boolean> {
    // TODO: Implement proper host/moderator check
    // This should integrate with MeetingsService to verify permissions
    return true;
  }
}