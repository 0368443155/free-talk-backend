import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { User } from '../../../../users/user.entity';
import { WaitingParticipant } from '../interfaces/waiting-participant.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);
  private readonly waitingParticipants = new Map<string, WaitingParticipant[]>();

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Add participant to waiting room
   */
  async addToWaitingRoom(
    roomId: string,
    user: User,
    socketId?: string,
  ): Promise<void> {
    // Check if room has waiting room feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.WAITING_ROOM,
    );
    if (!hasFeature) {
      throw new Error('Waiting room is disabled in this room');
    }

    const waitingList = this.waitingParticipants.get(roomId) || [];
    const existingIndex = waitingList.findIndex((p) => p.userId === user.id);

    const participant: WaitingParticipant = {
      userId: user.id,
      username: user.username,
      email: user.email,
      joinedAt: new Date(),
      socketId,
    };

    if (existingIndex >= 0) {
      waitingList[existingIndex] = participant;
    } else {
      waitingList.push(participant);
    }

    this.waitingParticipants.set(roomId, waitingList);
    this.logger.log(`User ${user.username} added to waiting room for room ${roomId}`);
  }

  /**
   * Remove participant from waiting room
   */
  async removeFromWaitingRoom(
    roomId: string,
    userId: string,
  ): Promise<WaitingParticipant | null> {
    const waitingList = this.waitingParticipants.get(roomId) || [];
    const participantIndex = waitingList.findIndex((p) => p.userId === userId);

    if (participantIndex >= 0) {
      const [removedParticipant] = waitingList.splice(participantIndex, 1);
      this.waitingParticipants.set(roomId, waitingList);
      return removedParticipant;
    }

    return null;
  }

  /**
   * Get all waiting participants
   */
  getWaitingParticipants(roomId: string): WaitingParticipant[] {
    return this.waitingParticipants.get(roomId) || [];
  }

  /**
   * Check if user is waiting
   */
  isUserWaiting(roomId: string, userId: string): boolean {
    const waitingList = this.waitingParticipants.get(roomId) || [];
    return waitingList.some((p) => p.userId === userId);
  }

  /**
   * Admit participant
   */
  async admitParticipant(
    roomId: string,
    userId: string,
    hostId: string,
  ): Promise<WaitingParticipant | null> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can admit participants');
    }

    const participant = await this.removeFromWaitingRoom(roomId, userId);
    if (participant) {
      this.logger.log(`Host ${hostId} admitted user ${participant.username} to room ${roomId}`);
    }

    return participant;
  }

  /**
   * Admit all participants
   */
  async admitAllParticipants(
    roomId: string,
    hostId: string,
  ): Promise<WaitingParticipant[]> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can admit participants');
    }

    const waitingList = this.waitingParticipants.get(roomId) || [];
    const admittedParticipants = [...waitingList];

    this.waitingParticipants.set(roomId, []);
    this.logger.log(
      `Host ${hostId} admitted all ${admittedParticipants.length} participants to room ${roomId}`,
    );

    return admittedParticipants;
  }

  /**
   * Deny participant entry
   */
  async denyParticipant(
    roomId: string,
    userId: string,
    hostId: string,
  ): Promise<WaitingParticipant | null> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new ForbiddenException('Only host can deny participants');
    }

    const participant = await this.removeFromWaitingRoom(roomId, userId);
    if (participant) {
      this.logger.log(
        `Host ${hostId} denied entry to user ${participant.username} for room ${roomId}`,
      );
    }

    return participant;
  }

  /**
   * Clear waiting room
   */
  clearWaitingRoom(roomId: string): void {
    this.waitingParticipants.delete(roomId);
    this.logger.log(`Cleared waiting room for room ${roomId}`);
  }

  /**
   * Get waiting room statistics
   */
  getWaitingRoomStats(roomId: string) {
    const waitingList = this.waitingParticipants.get(roomId) || [];

    return {
      totalWaiting: waitingList.length,
      participants: waitingList.map((p) => ({
        userId: p.userId,
        username: p.username,
        waitingTime: Date.now() - p.joinedAt.getTime(),
        isConnected: !!p.socketId,
      })),
    };
  }
}

