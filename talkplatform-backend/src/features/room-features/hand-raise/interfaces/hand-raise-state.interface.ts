/**
 * Hand raise state interface
 */
export interface HandRaiseState {
  userId: string;
  username: string;
  raisedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Hand raise queue
 */
export interface HandRaiseQueue {
  roomId: string;
  queue: HandRaiseState[];
}

