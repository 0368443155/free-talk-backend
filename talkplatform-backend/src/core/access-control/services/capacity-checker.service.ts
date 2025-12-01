import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from '../../../features/meeting/entities/meeting-participant.entity';
import { AccessValidationResult } from '../interfaces/access-validator.interface';

@Injectable()
export class CapacityCheckerService {
  private readonly logger = new Logger(CapacityCheckerService.name);

  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  /**
   * Check if room has capacity for another participant
   */
  async check(roomId: string, maxParticipants: number): Promise<AccessValidationResult> {
    try {
      const currentCount = await this.participantRepository.count({
        where: {
          meeting: { id: roomId },
          is_online: true,
        },
      });

      if (currentCount >= maxParticipants) {
        return {
          granted: false,
          reason: `Room is full. Maximum participants: ${maxParticipants}`,
          metadata: {
            currentCount,
            maxParticipants,
          },
        };
      }

      return {
        granted: true,
        metadata: {
          currentCount,
          maxParticipants,
          availableSlots: maxParticipants - currentCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check capacity for room ${roomId}:`, error);
      return {
        granted: false,
        reason: 'Error checking room capacity',
      };
    }
  }
}

