import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedParticipant } from '../../../meeting/entities/blocked-participant.entity';
import { MeetingParticipant } from '../../../meeting/entities/meeting-participant.entity';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class BlockUserService {
  private readonly logger = new Logger(BlockUserService.name);

  constructor(
    @InjectRepository(BlockedParticipant)
    private readonly blockedParticipantRepository: Repository<BlockedParticipant>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Block user from room
   */
  async blockUser(
    roomId: string,
    targetUserId: string,
    hostId: string,
    reason?: string,
  ): Promise<BlockedParticipant> {
    // Check if room has block feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.BLOCK_USER,
    );
    if (!hasFeature) {
      throw new ForbiddenException('Block user is disabled in this room');
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
      throw new ForbiddenException('Only host can block users');
    }

    // Add to blocked list
    const blockedParticipant = this.blockedParticipantRepository.create({
      meeting_id: roomId,
      user_id: targetUserId,
      blocked_by: hostId,
      reason: reason || 'Blocked by host',
    });

    await this.blockedParticipantRepository.save(blockedParticipant);

    // Remove participant
    await this.participantRepository.delete({
      meeting: { id: roomId },
      user: { id: targetUserId },
    });

    this.logger.log(
      `User ${targetUserId} blocked from room ${roomId} by host ${hostId}. Reason: ${reason || 'No reason provided'}`,
    );

    return blockedParticipant;
  }

  /**
   * Unblock user
   */
  async unblockUser(roomId: string, targetUserId: string, hostId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can unblock users');
    }

    await this.blockedParticipantRepository.delete({
      meeting_id: roomId,
      user_id: targetUserId,
    });

    this.logger.log(`User ${targetUserId} unblocked from room ${roomId} by host ${hostId}`);
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(roomId: string, userId: string): Promise<boolean> {
    const blocked = await this.blockedParticipantRepository.findOne({
      where: {
        meeting_id: roomId,
        user_id: userId,
      },
    });

    return !!blocked;
  }
}

