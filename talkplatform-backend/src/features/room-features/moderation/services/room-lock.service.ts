import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { RoomLifecycleService } from '../../../../core/room/services/room-lifecycle.service';

@Injectable()
export class RoomLockService {
  private readonly logger = new Logger(RoomLockService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly baseRoomService: BaseRoomService,
    private readonly roomLifecycle: RoomLifecycleService,
  ) {}

  /**
   * Lock room
   */
  async lockRoom(roomId: string, hostId: string): Promise<void> {
    // Check if room has lock feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.ROOM_LOCK,
    );
    if (!hasFeature) {
      throw new ForbiddenException('Room lock is disabled in this room');
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
      throw new ForbiddenException('Only host can lock room');
    }

    // Lock room
    await this.meetingRepository.update({ id: roomId }, { is_locked: true });
    await this.roomLifecycle.lockRoom(roomId);

    this.logger.log(`Room ${roomId} locked by host ${hostId}`);
  }

  /**
   * Unlock room
   */
  async unlockRoom(roomId: string, hostId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can unlock room');
    }

    // Unlock room
    await this.meetingRepository.update({ id: roomId }, { is_locked: false });
    await this.roomLifecycle.unlockRoom(roomId);

    this.logger.log(`Room ${roomId} unlocked by host ${hostId}`);
  }

  /**
   * Check if room is locked
   */
  async isRoomLocked(roomId: string): Promise<boolean> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      select: ['id', 'is_locked'],
    });

    return meeting?.is_locked || false;
  }
}

