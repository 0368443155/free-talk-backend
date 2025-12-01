import { RoomFeature } from '../enums/room-feature.enum';

/**
 * Interface for room feature implementations
 */
export interface IRoomFeature {
  /**
   * Feature identifier
   */
  feature: RoomFeature;
  
  /**
   * Initialize feature for a room
   */
  initialize(roomId: string, config?: Record<string, any>): Promise<void>;
  
  /**
   * Cleanup feature when room ends
   */
  cleanup(roomId: string): Promise<void>;
  
  /**
   * Check if feature is enabled
   */
  isEnabled(roomId: string): Promise<boolean>;
  
  /**
   * Get feature state
   */
  getState(roomId: string): Promise<Record<string, any>>;
  
  /**
   * Update feature state
   */
  updateState(roomId: string, state: Record<string, any>): Promise<void>;
}

