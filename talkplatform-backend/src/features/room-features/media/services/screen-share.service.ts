import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ScreenShareService {
  private readonly logger = new Logger(ScreenShareService.name);
  private readonly activeScreenShares = new Map<string, string>(); // roomId -> userId

  /**
   * Start screen sharing
   */
  async startScreenShare(roomId: string, userId: string): Promise<void> {
    // Check if someone else is already sharing
    const currentSharer = this.activeScreenShares.get(roomId);
    if (currentSharer && currentSharer !== userId) {
      throw new Error('Another user is already sharing their screen');
    }

    this.activeScreenShares.set(roomId, userId);
    this.logger.log(`User ${userId} started screen sharing in room ${roomId}`);
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(roomId: string, userId: string): Promise<void> {
    const currentSharer = this.activeScreenShares.get(roomId);
    if (currentSharer === userId) {
      this.activeScreenShares.delete(roomId);
      this.logger.log(`User ${userId} stopped screen sharing in room ${roomId}`);
    }
  }

  /**
   * Get current screen sharer
   */
  getCurrentSharer(roomId: string): string | undefined {
    return this.activeScreenShares.get(roomId);
  }

  /**
   * Check if someone is sharing
   */
  isSharing(roomId: string): boolean {
    return this.activeScreenShares.has(roomId);
  }

  /**
   * Force stop screen share (host action)
   */
  async forceStopScreenShare(roomId: string, targetUserId: string): Promise<void> {
    const currentSharer = this.activeScreenShares.get(roomId);
    if (currentSharer === targetUserId) {
      this.activeScreenShares.delete(roomId);
      this.logger.log(`Screen share force stopped for user ${targetUserId} in room ${roomId}`);
    }
  }
}

