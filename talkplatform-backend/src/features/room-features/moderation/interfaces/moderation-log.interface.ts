import { ModerationAction } from './moderation-action.interface';

/**
 * Moderation log interface
 */
export interface ModerationLog {
  roomId: string;
  actions: ModerationAction[];
  createdAt: Date;
  updatedAt: Date;
}

