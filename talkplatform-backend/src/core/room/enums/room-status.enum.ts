/**
 * Enum defining room status states
 */
export enum RoomStatus {
  /** Room is empty */
  EMPTY = 'empty',
  
  /** Room is available for joining */
  AVAILABLE = 'available',
  
  /** Room is getting crowded */
  CROWDED = 'crowded',
  
  /** Room is full */
  FULL = 'full',
  
  /** Room is locked */
  LOCKED = 'locked',
  
  /** Room is ended */
  ENDED = 'ended',
}

