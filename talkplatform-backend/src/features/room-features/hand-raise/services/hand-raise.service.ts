import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from '../../../meeting/entities/meeting-participant.entity';
import { HandRaiseState } from '../interfaces/hand-raise-state.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class HandRaiseService {
  private readonly logger = new Logger(HandRaiseService.name);
  private readonly handRaiseQueues = new Map<string, HandRaiseState[]>(); // roomId -> queue

  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Raise hand
   */
  async raiseHand(roomId: string, userId: string, username: string): Promise<void> {
    // Check if room has hand raise feature
    const hasFeature = await this.baseRoomService.hasFeature(roomId, RoomFeature.HAND_RAISE);
    if (!hasFeature) {
      throw new Error('Hand raise is disabled in this room');
    }

    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: roomId },
        user: { id: userId },
      },
      { is_hand_raised: true },
    );

    // Add to queue
    const queue = this.getQueue(roomId);
    const existingIndex = queue.findIndex((item) => item.userId === userId);
    
    if (existingIndex === -1) {
      queue.push({
        userId,
        username,
        raisedAt: new Date(),
        acknowledged: false,
      });
    }

    this.logger.log(`User ${userId} raised hand in room ${roomId}`);
  }

  /**
   * Lower hand
   */
  async lowerHand(roomId: string, userId: string): Promise<void> {
    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: roomId },
        user: { id: userId },
      },
      { is_hand_raised: false },
    );

    // Remove from queue
    const queue = this.getQueue(roomId);
    const index = queue.findIndex((item) => item.userId === userId);
    if (index > -1) {
      queue.splice(index, 1);
    }

    this.logger.log(`User ${userId} lowered hand in room ${roomId}`);
  }

  /**
   * Acknowledge hand raise (host action)
   */
  async acknowledgeHandRaise(
    roomId: string,
    userId: string,
    acknowledgedBy: string,
  ): Promise<void> {
    const queue = this.getQueue(roomId);
    const item = queue.find((item) => item.userId === userId);
    
    if (item) {
      item.acknowledged = true;
      item.acknowledgedBy = acknowledgedBy;
      item.acknowledgedAt = new Date();
    }

    this.logger.log(`Hand raise acknowledged for user ${userId} by ${acknowledgedBy}`);
  }

  /**
   * Get hand raise queue
   */
  getQueue(roomId: string): HandRaiseState[] {
    if (!this.handRaiseQueues.has(roomId)) {
      this.handRaiseQueues.set(roomId, []);
    }
    return this.handRaiseQueues.get(roomId)!;
  }

  /**
   * Get all raised hands for a room
   */
  async getRaisedHands(roomId: string): Promise<HandRaiseState[]> {
    const participants = await this.participantRepository.find({
      where: {
        meeting: { id: roomId },
        is_hand_raised: true,
      },
      relations: ['user'],
    });

    return participants.map((p) => ({
      userId: p.user.id,
      username: p.user.username,
      raisedAt: p.joined_at, // Use joined_at as approximation
      acknowledged: false,
    }));
  }

  /**
   * Clear hand raise queue
   */
  clearQueue(roomId: string): void {
    this.handRaiseQueues.delete(roomId);
  }
}

