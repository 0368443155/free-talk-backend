import { Injectable, Logger } from '@nestjs/common';
import { Reaction, ReactionState } from '../interfaces/reaction.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReactionsService {
  private readonly logger = new Logger(ReactionsService.name);
  private readonly reactionStates = new Map<string, ReactionState>(); // roomId -> state

  constructor(private readonly baseRoomService: BaseRoomService) {}

  /**
   * Add reaction
   */
  async addReaction(
    roomId: string,
    userId: string,
    username: string,
    reaction: string,
  ): Promise<Reaction> {
    // Check if room has reactions feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.REACTIONS,
    );
    if (!hasFeature) {
      throw new Error('Reactions are disabled in this room');
    }

    const state = this.getState(roomId);
    const reactions = state.reactions.get(reaction) || [];

    // Check if user already reacted with this emoji
    const existingIndex = reactions.findIndex((r) => r.userId === userId);
    if (existingIndex > -1) {
      // User already reacted, remove old reaction
      reactions.splice(existingIndex, 1);
    }

    // Add new reaction
    const newReaction: Reaction = {
      id: uuidv4(),
      userId,
      username,
      reaction,
      timestamp: new Date(),
    };

    reactions.push(newReaction);
    state.reactions.set(reaction, reactions);

    this.logger.log(`User ${userId} added reaction ${reaction} in room ${roomId}`);

    return newReaction;
  }

  /**
   * Remove reaction
   */
  async removeReaction(roomId: string, userId: string, reaction: string): Promise<void> {
    const state = this.getState(roomId);
    const reactions = state.reactions.get(reaction) || [];

    const index = reactions.findIndex((r) => r.userId === userId);
    if (index > -1) {
      reactions.splice(index, 1);
      if (reactions.length === 0) {
        state.reactions.delete(reaction);
      } else {
        state.reactions.set(reaction, reactions);
      }
    }

    this.logger.log(`User ${userId} removed reaction ${reaction} in room ${roomId}`);
  }

  /**
   * Get all reactions for a room
   */
  getReactions(roomId: string): Map<string, Reaction[]> {
    const state = this.getState(roomId);
    return state.reactions;
  }

  /**
   * Get reaction count for a specific reaction type
   */
  getReactionCount(roomId: string, reaction: string): number {
    const state = this.getState(roomId);
    return state.reactions.get(reaction)?.length || 0;
  }

  /**
   * Clear all reactions for a room
   */
  clearReactions(roomId: string): void {
    this.reactionStates.delete(roomId);
    this.logger.log(`All reactions cleared for room ${roomId}`);
  }

  /**
   * Get or create reaction state
   */
  private getState(roomId: string): ReactionState {
    if (!this.reactionStates.has(roomId)) {
      this.reactionStates.set(roomId, {
        roomId,
        reactions: new Map(),
      });
    }
    return this.reactionStates.get(roomId)!;
  }
}

