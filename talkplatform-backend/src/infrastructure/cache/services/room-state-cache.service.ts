import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';
import { RoomState } from '../../../core/room/interfaces/room-state.interface';

@Injectable()
export class RoomStateCacheService {
  private readonly KEY_PREFIX = 'room:state:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(private readonly cache: RedisCacheService) {}

  /**
   * Get room state from cache
   */
  async getRoomState(roomId: string): Promise<RoomState | null> {
    const key = `${this.KEY_PREFIX}${roomId}`;
    return this.cache.get<RoomState>(key);
  }

  /**
   * Set room state in cache
   */
  async setRoomState(roomId: string, state: RoomState, ttl?: number): Promise<void> {
    const key = `${this.KEY_PREFIX}${roomId}`;
    await this.cache.set(key, state, ttl || this.DEFAULT_TTL);
  }

  /**
   * Delete room state from cache
   */
  async deleteRoomState(roomId: string): Promise<void> {
    const key = `${this.KEY_PREFIX}${roomId}`;
    await this.cache.delete(key);
  }

  /**
   * Check if room state exists in cache
   */
  async roomStateExists(roomId: string): Promise<boolean> {
    const key = `${this.KEY_PREFIX}${roomId}`;
    return this.cache.exists(key);
  }
}

