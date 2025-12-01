import { Injectable, Logger } from '@nestjs/common';
import { RoomStatus } from '../enums/room-status.enum';
import { BaseRoomService } from './base-room.service';
import { RoomStateManagerService } from './room-state-manager.service';

@Injectable()
export class RoomLifecycleService {
  private readonly logger = new Logger(RoomLifecycleService.name);

  constructor(
    private readonly baseRoomService: BaseRoomService,
    private readonly roomStateManager: RoomStateManagerService,
  ) {}

  /**
   * Start room (mark as live)
   */
  async startRoom(roomId: string): Promise<void> {
    await this.roomStateManager.updateRoomState(roomId, {
      status: RoomStatus.AVAILABLE,
    });

    this.logger.log(`Room ${roomId} started`);
  }

  /**
   * End room (mark as ended)
   */
  async endRoom(roomId: string): Promise<void> {
    await this.roomStateManager.updateRoomState(roomId, {
      status: RoomStatus.ENDED,
    });

    this.logger.log(`Room ${roomId} ended`);
  }

  /**
   * Lock room
   */
  async lockRoom(roomId: string): Promise<void> {
    await this.roomStateManager.updateRoomState(roomId, {
      status: RoomStatus.LOCKED,
    });

    this.logger.log(`Room ${roomId} locked`);
  }

  /**
   * Unlock room
   */
  async unlockRoom(roomId: string): Promise<void> {
    const state = await this.baseRoomService.getRoomState(roomId);
    if (!state) {
      throw new Error(`Room ${roomId} not found`);
    }

    // Determine appropriate status based on participant count
    const participantCount = state.participants.size;
    let newStatus: RoomStatus;
    
    if (participantCount === 0) {
      newStatus = RoomStatus.EMPTY;
    } else if (participantCount >= 10) {
      newStatus = RoomStatus.CROWDED;
    } else {
      newStatus = RoomStatus.AVAILABLE;
    }

    await this.roomStateManager.updateRoomState(roomId, {
      status: newStatus,
    });

    this.logger.log(`Room ${roomId} unlocked`);
  }

  /**
   * Cleanup expired rooms
   */
  async cleanupExpiredRooms(): Promise<number> {
    // This would typically query Redis for expired keys
    // For now, we'll just log
    this.logger.log('Cleaning up expired rooms...');
    return 0;
  }
}

