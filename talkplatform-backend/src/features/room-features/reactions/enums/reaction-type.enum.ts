/**
 * Reaction type enum
 */
export enum ReactionType {
  LIKE = '👍',
  LOVE = '❤️',
  LAUGH = '😂',
  WOW = '😮',
  SAD = '😢',
  ANGRY = '😠',
  CLAP = '👏',
  FIRE = '🔥',
}

/**
 * Get all available reaction types
 */
export function getAllReactionTypes(): string[] {
  return Object.values(ReactionType);
}

