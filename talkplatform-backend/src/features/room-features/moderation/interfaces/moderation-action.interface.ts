// ModerationActionType is exported from enums, not here

import { ModerationActionType } from '../enums/moderation-action-type.enum';

/**
 * Moderation action interface
 */
export interface ModerationAction {
  id: string;
  roomId: string;
  actionType: ModerationActionType;
  targetUserId: string;
  performedBy: string;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

