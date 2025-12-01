import { RoomConfig } from './room-config.interface';
import { RoomState } from './room-state.interface';
import { RoomFeature } from '../enums/room-feature.enum';

/**
 * Interface for room service implementations
 */
export interface IRoomService {
  /**
   * Create a new room
   */
  createRoom(config: RoomConfig, hostId: string): Promise<string>;
  
  /**
   * Get room configuration
   */
  getRoomConfig(roomId: string): Promise<RoomConfig>;
  
  /**
   * Get room state
   */
  getRoomState(roomId: string): Promise<RoomState>;
  
  /**
   * Update room state
   */
  updateRoomState(roomId: string, state: Partial<RoomState>): Promise<void>;
  
  /**
   * Check if room has feature
   */
  hasFeature(roomId: string, feature: RoomFeature): Promise<boolean>;
  
  /**
   * Enable feature
   */
  enableFeature(roomId: string, feature: RoomFeature): Promise<void>;
  
  /**
   * Disable feature
   */
  disableFeature(roomId: string, feature: RoomFeature): Promise<void>;
  
  /**
   * Delete room
   */
  deleteRoom(roomId: string): Promise<void>;
}

