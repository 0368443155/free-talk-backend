import { RoomConfig } from '../../room/interfaces/room-config.interface';
import { AccessValidationResult } from './access-validator.interface';

/**
 * Interface for access rules
 */
export interface IAccessRule {
  /**
   * Check if this rule applies to the given context
   */
  applies(roomConfig: RoomConfig): boolean;
  
  /**
   * Validate access according to this rule
   */
  validate(
    userId: string,
    roomId: string,
    roomConfig: RoomConfig,
  ): Promise<AccessValidationResult>;
  
  /**
   * Priority of this rule (higher = checked first)
   */
  priority: number;
}

