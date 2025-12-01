import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from '../../../meeting/entities/meeting-participant.entity';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class KickUserService {
  private readonly logger = new Logger(KickUserService.name);

  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Kick user from room
   */
  async kickUser(
    roomId: string,
    targetUserId: string,
    hostId: string,
    reason?: string,
  ): Promise<void> {
    // Check if room has kick feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.KICK_USER,
    );
    if (!hasFeature) {
      throw new ForbiddenException('Kick user is disabled in this room');
    }

    // Verify host permission
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can kick users');
    }

    // Remove participant
    await this.participantRepository.delete({
      meeting: { id: roomId },
      user: { id: targetUserId },
    });

    this.logger.log(
      `User ${targetUserId} kicked from room ${roomId} by host ${hostId}. Reason: ${reason || 'No reason provided'}`,
    );
  }
}

