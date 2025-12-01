import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingStatus } from '../../../features/meeting/entities/meeting.entity';
import { AccessValidationResult } from '../interfaces/access-validator.interface';

@Injectable()
export class TimeBasedAccessService {
  private readonly logger = new Logger(TimeBasedAccessService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  /**
   * Check if room is accessible based on time restrictions
   */
  async check(roomId: string): Promise<AccessValidationResult> {
    try {
      const meeting = await this.meetingRepository.findOne({
        where: { id: roomId },
      });

      if (!meeting) {
        return {
          granted: false,
          reason: 'Room not found',
        };
      }

      // Check if meeting is scheduled and hasn't started yet
      if (
        meeting.status === MeetingStatus.SCHEDULED &&
        meeting.scheduled_at &&
        meeting.scheduled_at > new Date()
      ) {
        return {
          granted: false,
          reason: 'Room has not started yet',
          metadata: {
            scheduledAt: meeting.scheduled_at,
          },
        };
      }

      // Check if meeting has ended
      if (meeting.status === MeetingStatus.ENDED) {
        return {
          granted: false,
          reason: 'Room has ended',
        };
      }

      // Check if meeting is cancelled
      if (meeting.status === MeetingStatus.CANCELLED) {
        return {
          granted: false,
          reason: 'Room has been cancelled',
        };
      }

      return {
        granted: true,
        metadata: {
          status: meeting.status,
          scheduledAt: meeting.scheduled_at,
          startedAt: meeting.started_at,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check time-based access for room ${roomId}:`, error);
      return {
        granted: false,
        reason: 'Error checking time-based access',
      };
    }
  }
}

