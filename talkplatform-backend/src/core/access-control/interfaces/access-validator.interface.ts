import { RoomConfig } from '../../room/interfaces/room-config.interface';

/**
 * Result of access validation
 */
export interface AccessValidationResult {
  /** Whether access is granted */
  granted: boolean;
  
  /** Reason for denial (if not granted) */
  reason?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Interface for access validators
 */
export interface IAccessValidator {
  /**
   * Validate access to a room
   */
  validate(
    userId: string,
    roomId: string,
    roomConfig: RoomConfig,
  ): Promise<AccessValidationResult>;
}

