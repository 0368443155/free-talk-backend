import { Injectable, Logger } from '@nestjs/common';
import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomState, ParticipantState, ParticipantRole } from '../interfaces/room-state.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomStateManagerService } from './room-state-manager.service';

@Injectable()
export class BaseRoomService {
  private readonly logger = new Logger(BaseRoomService.name);
  private readonly roomConfigs = new Map<string, RoomConfig>();
  private readonly roomStates = new Map<string, RoomState>();

  constructor(
    private readonly roomStateManager: RoomStateManagerService,
  ) {}

  /**
   * Initialize room with configuration
   */
  async initializeRoom(roomId: string, config: RoomConfig, hostId: string): Promise<void> {
    // Store config
    this.roomConfigs.set(roomId, config);

    // Create initial state
    const initialState: RoomState = {
      roomId,
      roomType: config.roomType,
      status: RoomStatus.EMPTY,
      hostId,
      participants: new Map(),
      features: new Map(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize features
    for (const feature of config.features) {
      initialState.features.set(feature, {
        feature,
        enabled: true,
        config: {},
        state: {},
      });
    }

    // Save to Redis
    await this.roomStateManager.saveRoomState(
      roomId,
      initialState,
      config.stateManagement.stateTtl,
    );

    // Store in memory
    this.roomStates.set(roomId, initialState);

    this.logger.log(`Room ${roomId} initialized with type ${config.roomType}`);
  }

  /**
   * Get room configuration
   */
  getRoomConfig(roomId: string): RoomConfig | null {
    return this.roomConfigs.get(roomId) || null;
  }

  /**
   * Get room state
   */
  async getRoomState(roomId: string): Promise<RoomState | null> {
    // Try Redis first
    const state = await this.roomStateManager.getRoomState(roomId);
    if (state) {
      return state;
    }

    // Fallback to memory
    return this.roomStates.get(roomId) || null;
  }

  /**
   * Check if room has feature
   */
  async hasFeature(roomId: string, feature: RoomFeature): Promise<boolean> {
    const config = this.getRoomConfig(roomId);
    if (!config) {
      return false;
    }

    return config.features.includes(feature);
  }

  /**
   * Enable feature
   */
  async enableFeature(roomId: string, feature: RoomFeature): Promise<void> {
    const config = this.getRoomConfig(roomId);
    if (!config) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!config.features.includes(feature)) {
      config.features.push(feature);
    }

    // Update feature state
    await this.roomStateManager.updateFeatureState(roomId, feature, {
      enabled: true,
    });
  }

  /**
   * Disable feature
   */
  async disableFeature(roomId: string, feature: RoomFeature): Promise<void> {
    const config = this.getRoomConfig(roomId);
    if (!config) {
      throw new Error(`Room ${roomId} not found`);
    }

    // Update feature state
    await this.roomStateManager.updateFeatureState(roomId, feature, {
      enabled: false,
    });
  }

  /**
   * Add participant to room
   */
  async addParticipant(
    roomId: string,
    userId: string,
    username: string,
    role: ParticipantRole = ParticipantRole.PARTICIPANT,
  ): Promise<void> {
    const participant: ParticipantState = {
      userId,
      username,
      role,
      isOnline: true,
      isMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      isScreenSharing: false,
      joinedAt: new Date(),
      lastActivity: new Date(),
    };

    await this.roomStateManager.addParticipant(roomId, participant);
    
    // Update room status based on participant count
    await this.updateRoomStatus(roomId);
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.roomStateManager.removeParticipant(roomId, userId);
    
    // Update room status
    await this.updateRoomStatus(roomId);
  }

  /**
   * Update participant state
   */
  async updateParticipant(
    roomId: string,
    userId: string,
    updates: Partial<ParticipantState>,
  ): Promise<void> {
    await this.roomStateManager.updateParticipant(roomId, userId, updates);
  }

  /**
   * Update room status based on participant count
   */
  private async updateRoomStatus(roomId: string): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (!state) {
      return;
    }

    const config = this.getRoomConfig(roomId);
    if (!config) {
      return;
    }

    const participantCount = state.participants.size;
    const maxParticipants = config.maxParticipants;

    let newStatus: RoomStatus;
    if (participantCount === 0) {
      newStatus = RoomStatus.EMPTY;
    } else if (participantCount >= maxParticipants) {
      newStatus = RoomStatus.FULL;
    } else if (participantCount >= maxParticipants * 0.8) {
      newStatus = RoomStatus.CROWDED;
    } else {
      newStatus = RoomStatus.AVAILABLE;
    }

    if (newStatus !== state.status) {
      await this.roomStateManager.updateRoomState(roomId, { status: newStatus });
    }
  }

  /**
   * Cleanup room
   */
  async cleanupRoom(roomId: string): Promise<void> {
    await this.roomStateManager.deleteRoomState(roomId);
    this.roomConfigs.delete(roomId);
    this.roomStates.delete(roomId);
    
    this.logger.log(`Room ${roomId} cleaned up`);
  }
}

