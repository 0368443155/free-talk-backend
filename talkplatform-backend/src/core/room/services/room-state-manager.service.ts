import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { RoomState, ParticipantState, FeatureState } from '../interfaces/room-state.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { RoomStatus } from '../enums/room-status.enum';

@Injectable()
export class RoomStateManagerService {
  private readonly logger = new Logger(RoomStateManagerService.name);
  private readonly ROOM_STATE_KEY_PREFIX = 'room:state:';
  private readonly ROOM_PARTICIPANTS_KEY_PREFIX = 'room:participants:';
  private readonly ROOM_FEATURES_KEY_PREFIX = 'room:features:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Get room state from Redis
   */
  async getRoomState(roomId: string): Promise<RoomState | null> {
    try {
      const key = `${this.ROOM_STATE_KEY_PREFIX}${roomId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }

      const state = JSON.parse(data);
      
      // Parse participants map
      if (state.participants) {
        state.participants = new Map(Object.entries(state.participants));
      }
      
      // Parse features map
      if (state.features) {
        state.features = new Map(Object.entries(state.features));
      }

      return state as RoomState;
    } catch (error) {
      this.logger.error(`Failed to get room state for ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Save room state to Redis
   */
  async saveRoomState(roomId: string, state: RoomState, ttl?: number): Promise<void> {
    try {
      const key = `${this.ROOM_STATE_KEY_PREFIX}${roomId}`;
      
      // Convert Maps to objects for JSON serialization
      const serializableState = {
        ...state,
        participants: Object.fromEntries(state.participants),
        features: Object.fromEntries(state.features),
      };

      await this.redis.setex(
        key,
        ttl || this.DEFAULT_TTL,
        JSON.stringify(serializableState),
      );
    } catch (error) {
      this.logger.error(`Failed to save room state for ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Update room state partially
   */
  async updateRoomState(
    roomId: string,
    updates: Partial<RoomState>,
    ttl?: number,
  ): Promise<void> {
    try {
      const currentState = await this.getRoomState(roomId);
      
      if (!currentState) {
        throw new Error(`Room state not found for ${roomId}`);
      }

      const updatedState: RoomState = {
        ...currentState,
        ...updates,
        updatedAt: new Date(),
      };

      await this.saveRoomState(roomId, updatedState, ttl);
    } catch (error) {
      this.logger.error(`Failed to update room state for ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Add participant to room state
   */
  async addParticipant(
    roomId: string,
    participant: ParticipantState,
  ): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      throw new Error(`Room state not found for ${roomId}`);
    }

    state.participants.set(participant.userId, participant);
    await this.updateRoomState(roomId, { participants: state.participants });
  }

  /**
   * Remove participant from room state
   */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      return;
    }

    state.participants.delete(userId);
    await this.updateRoomState(roomId, { participants: state.participants });
  }

  /**
   * Update participant state
   */
  async updateParticipant(
    roomId: string,
    userId: string,
    updates: Partial<ParticipantState>,
  ): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      throw new Error(`Room state not found for ${roomId}`);
    }

    const participant = state.participants.get(userId);
    if (!participant) {
      throw new Error(`Participant ${userId} not found in room ${roomId}`);
    }

    const updatedParticipant: ParticipantState = {
      ...participant,
      ...updates,
      lastActivity: new Date(),
    };

    state.participants.set(userId, updatedParticipant);
    await this.updateRoomState(roomId, { participants: state.participants });
  }

  /**
   * Get feature state
   */
  async getFeatureState(
    roomId: string,
    feature: RoomFeature,
  ): Promise<FeatureState | null> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      return null;
    }

    return state.features.get(feature) || null;
  }

  /**
   * Update feature state
   */
  async updateFeatureState(
    roomId: string,
    feature: RoomFeature,
    updates: Partial<FeatureState>,
  ): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      throw new Error(`Room state not found for ${roomId}`);
    }

    const currentFeature = state.features.get(feature) || {
      feature,
      enabled: false,
      config: {},
      state: {},
    };

    const updatedFeature: FeatureState = {
      ...currentFeature,
      ...updates,
    };

    state.features.set(feature, updatedFeature);
    await this.updateRoomState(roomId, { features: state.features });
  }

  /**
   * Delete room state
   */
  async deleteRoomState(roomId: string): Promise<void> {
    try {
      const key = `${this.ROOM_STATE_KEY_PREFIX}${roomId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete room state for ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Check if room state exists
   */
  async roomStateExists(roomId: string): Promise<boolean> {
    try {
      const key = `${this.ROOM_STATE_KEY_PREFIX}${roomId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check room state existence for ${roomId}:`, error);
      return false;
    }
  }
}

