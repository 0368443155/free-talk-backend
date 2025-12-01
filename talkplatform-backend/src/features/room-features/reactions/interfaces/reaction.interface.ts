/**
 * Reaction interface
 */
export interface Reaction {
  id: string;
  userId: string;
  username: string;
  reaction: string; // emoji or reaction type
  timestamp: Date;
}

/**
 * Reaction state for a room
 */
export interface ReactionState {
  roomId: string;
  reactions: Map<string, Reaction[]>; // reaction type -> reactions
}

