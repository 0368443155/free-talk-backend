import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../entities/meeting.entity';
import { User } from '../../../users/user.entity';

export interface WaitingParticipant {
  userId: string;
  username: string;
  email: string;
  joinedAt: Date;
  socketId?: string;
}

/**
 * UC-03: Waiting Room Service
 * Manages participants waiting for host approval before joining meeting
 */
@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);
  
  // In-memory store for waiting participants
  // In production, consider using Redis for scalability
  private waitingParticipants = new Map<string, WaitingParticipant[]>();
  
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  /**
   * Add participant to waiting room
   */
  async addToWaitingRoom(meetingId: string, user: User, socketId?: string): Promise<void> {
    const waitingList = this.waitingParticipants.get(meetingId) || [];
    
    // Check if user is already waiting
    const existingIndex = waitingList.findIndex(p => p.userId === user.id);
    
    const participant: WaitingParticipant = {
      userId: user.id,
      username: user.username,
      email: user.email,
      joinedAt: new Date(),
      socketId,
    };

    if (existingIndex >= 0) {
      // Update existing participant (e.g., new socket connection)
      waitingList[existingIndex] = participant;
    } else {
      // Add new participant
      waitingList.push(participant);
    }

    this.waitingParticipants.set(meetingId, waitingList);
    
    this.logger.log(`User ${user.username} added to waiting room for meeting ${meetingId}`);
  }

  /**
   * Remove participant from waiting room
   */
  async removeFromWaitingRoom(meetingId: string, userId: string): Promise<WaitingParticipant | null> {
    const waitingList = this.waitingParticipants.get(meetingId) || [];
    const participantIndex = waitingList.findIndex(p => p.userId === userId);
    
    if (participantIndex >= 0) {
      const [removedParticipant] = waitingList.splice(participantIndex, 1);
      this.waitingParticipants.set(meetingId, waitingList);
      
      this.logger.log(`User ${removedParticipant.username} removed from waiting room for meeting ${meetingId}`);
      return removedParticipant;
    }
    
    return null;
  }

  /**
   * Get all participants waiting for a meeting
   */
  getWaitingParticipants(meetingId: string): WaitingParticipant[] {
    return this.waitingParticipants.get(meetingId) || [];
  }

  /**
   * Check if user is in waiting room
   */
  isUserWaiting(meetingId: string, userId: string): boolean {
    const waitingList = this.waitingParticipants.get(meetingId) || [];
    return waitingList.some(p => p.userId === userId);
  }

  /**
   * Admit participant from waiting room
   */
  async admitParticipant(meetingId: string, userId: string, hostId: string): Promise<WaitingParticipant | null> {
    // Verify meeting exists and host has permission
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new Error('Only host can admit participants');
    }

    // Remove from waiting room
    const participant = await this.removeFromWaitingRoom(meetingId, userId);
    
    if (participant) {
      this.logger.log(`Host ${hostId} admitted user ${participant.username} to meeting ${meetingId}`);
    }
    
    return participant;
  }

  /**
   * Admit all waiting participants
   */
  async admitAllParticipants(meetingId: string, hostId: string): Promise<WaitingParticipant[]> {
    // Verify meeting exists and host has permission
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new Error('Only host can admit participants');
    }

    const waitingList = this.waitingParticipants.get(meetingId) || [];
    const admittedParticipants = [...waitingList];
    
    // Clear waiting room
    this.waitingParticipants.set(meetingId, []);
    
    this.logger.log(`Host ${hostId} admitted all ${admittedParticipants.length} participants to meeting ${meetingId}`);
    
    return admittedParticipants;
  }

  /**
   * Deny participant entry (kick from waiting room)
   */
  async denyParticipant(meetingId: string, userId: string, hostId: string): Promise<WaitingParticipant | null> {
    // Verify meeting exists and host has permission
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.host.id !== hostId) {
      throw new Error('Only host can deny participants');
    }

    const participant = await this.removeFromWaitingRoom(meetingId, userId);
    
    if (participant) {
      this.logger.log(`Host ${hostId} denied entry to user ${participant.username} for meeting ${meetingId}`);
    }
    
    return participant;
  }

  /**
   * Update participant socket ID (for real-time communication)
   */
  updateParticipantSocket(meetingId: string, userId: string, socketId: string): void {
    const waitingList = this.waitingParticipants.get(meetingId) || [];
    const participant = waitingList.find(p => p.userId === userId);
    
    if (participant) {
      participant.socketId = socketId;
      this.waitingParticipants.set(meetingId, waitingList);
    }
  }

  /**
   * Clear waiting room when meeting ends
   */
  clearWaitingRoom(meetingId: string): void {
    this.waitingParticipants.delete(meetingId);
    this.logger.log(`Cleared waiting room for meeting ${meetingId}`);
  }

  /**
   * Get waiting room statistics
   */
  getWaitingRoomStats(meetingId: string) {
    const waitingList = this.waitingParticipants.get(meetingId) || [];
    
    return {
      totalWaiting: waitingList.length,
      participants: waitingList.map(p => ({
        userId: p.userId,
        username: p.username,
        waitingTime: Date.now() - p.joinedAt.getTime(),
        isConnected: !!p.socketId,
      })),
    };
  }

  /**
   * Check if meeting has waiting room enabled
   */
  async isMeetingWaitingRoomEnabled(meetingId: string): Promise<boolean> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      select: ['id', 'settings'],
    });

    return meeting?.settings?.waiting_room === true;
  }
}