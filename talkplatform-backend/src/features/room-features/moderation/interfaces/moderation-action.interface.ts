/**
 * Moderation action types
 */
export enum ModerationActionType {
  KICK = 'kick',
  BLOCK = 'block',
  MUTE = 'mute',
  UNMUTE = 'unmute',
  VIDEO_OFF = 'video_off',
  VIDEO_ON = 'video_on',
  STOP_SHARE = 'stop_share',
  ROOM_LOCK = 'room_lock',
  ROOM_UNLOCK = 'room_unlock',
  PROMOTE_MODERATOR = 'promote_moderator',
  DEMOTE_MODERATOR = 'demote_moderator',
}

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

