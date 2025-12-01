/**
 * Enum defining moderation levels for rooms
 */
export enum ModerationLevel {
  /** No moderation features */
  NONE = 'none',
  
  /** Basic moderation (kick, mute) */
  BASIC = 'basic',
  
  /** Advanced moderation (all features) */
  ADVANCED = 'advanced',
}

