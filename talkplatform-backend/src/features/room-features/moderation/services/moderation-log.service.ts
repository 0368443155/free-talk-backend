import { Injectable, Logger } from '@nestjs/common';
import { ModerationAction, ModerationActionType } from '../interfaces/moderation-action.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ModerationLogService {
  private readonly logger = new Logger(ModerationLogService.name);
  private readonly logs = new Map<string, ModerationAction[]>(); // roomId -> actions

  /**
   * Log moderation action
   */
  logAction(
    roomId: string,
    actionType: ModerationActionType,
    targetUserId: string,
    performedBy: string,
    reason?: string,
    metadata?: Record<string, any>,
  ): ModerationAction {
    const action: ModerationAction = {
      id: uuidv4(),
      roomId,
      actionType,
      targetUserId,
      performedBy,
      reason,
      timestamp: new Date(),
      metadata,
    };

    const roomLogs = this.logs.get(roomId) || [];
    roomLogs.push(action);
    this.logs.set(roomId, roomLogs);

    this.logger.log(
      `Moderation action logged: ${actionType} on user ${targetUserId} in room ${roomId} by ${performedBy}`,
    );

    return action;
  }

  /**
   * Get moderation logs for a room
   */
  getLogs(roomId: string, limit: number = 100): ModerationAction[] {
    const roomLogs = this.logs.get(roomId) || [];
    return roomLogs.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get logs for a specific user
   */
  getUserLogs(roomId: string, userId: string): ModerationAction[] {
    const roomLogs = this.logs.get(roomId) || [];
    return roomLogs.filter((action) => action.targetUserId === userId);
  }

  /**
   * Clear logs for a room
   */
  clearLogs(roomId: string): void {
    this.logs.delete(roomId);
    this.logger.log(`Moderation logs cleared for room ${roomId}`);
  }
}

