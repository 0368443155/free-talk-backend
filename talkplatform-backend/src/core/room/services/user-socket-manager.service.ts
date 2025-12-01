import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

/**
 * User Socket Manager Service
 * Manages user-to-socket mapping for cross-gateway communication
 * Uses Redis for distributed socket tracking
 */
@Injectable()
export class UserSocketManagerService {
  private readonly logger = new Logger(UserSocketManagerService.name);
  private readonly SOCKET_KEY_PREFIX = 'user:socket:';
  private readonly SOCKET_TTL = 3600; // 1 hour

  // In-memory fallback for single-instance deployments
  private localSocketMap = new Map<string, string>();

  constructor(@InjectRedis() private readonly redis?: Redis) {}

  /**
   * Track user socket connection
   */
  async trackUserSocket(userId: string, socketId: string, namespace?: string): Promise<void> {
    const key = this.getKey(userId, namespace);
    
    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(key, this.SOCKET_TTL, socketId);
      } catch (error) {
        this.logger.warn(`Failed to store socket in Redis: ${error.message}`);
      }
    }

    // Store in local map as fallback
    this.localSocketMap.set(key, socketId);
  }

  /**
   * Remove user socket tracking
   */
  async removeUserSocket(userId: string, namespace?: string): Promise<void> {
    const key = this.getKey(userId, namespace);

    // Remove from Redis if available
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        this.logger.warn(`Failed to remove socket from Redis: ${error.message}`);
      }
    }

    // Remove from local map
    this.localSocketMap.delete(key);
  }

  /**
   * Get socket ID for user
   */
  async getUserSocket(userId: string, namespace?: string): Promise<string | null> {
    const key = this.getKey(userId, namespace);

    // Try Redis first
    if (this.redis) {
      try {
        const socketId = await this.redis.get(key);
        if (socketId) {
          return socketId;
        }
      } catch (error) {
        this.logger.warn(`Failed to get socket from Redis: ${error.message}`);
      }
    }

    // Fallback to local map
    return this.localSocketMap.get(key) || null;
  }

  /**
   * Get all socket IDs for a user across all namespaces
   */
  async getAllUserSockets(userId: string): Promise<string[]> {
    const sockets: string[] = [];

    // Try Redis
    if (this.redis) {
      try {
        const pattern = `${this.SOCKET_KEY_PREFIX}${userId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          const values = await this.redis.mget(keys);
          sockets.push(...values.filter((v): v is string => v !== null));
        }
      } catch (error) {
        this.logger.warn(`Failed to get sockets from Redis: ${error.message}`);
      }
    }

    // Fallback to local map
    const localPattern = `${this.SOCKET_KEY_PREFIX}${userId}:`;
    for (const [key, socketId] of this.localSocketMap.entries()) {
      if (key.startsWith(localPattern)) {
        sockets.push(socketId);
      }
    }

    return [...new Set(sockets)]; // Remove duplicates
  }

  /**
   * Check if user has active socket
   */
  async hasActiveSocket(userId: string, namespace?: string): Promise<boolean> {
    const socketId = await this.getUserSocket(userId, namespace);
    return socketId !== null;
  }

  /**
   * Get Redis key for user socket
   */
  private getKey(userId: string, namespace?: string): string {
    if (namespace) {
      return `${this.SOCKET_KEY_PREFIX}${userId}:${namespace}`;
    }
    return `${this.SOCKET_KEY_PREFIX}${userId}`;
  }

  /**
   * Clean up expired sockets (called periodically)
   */
  async cleanupExpiredSockets(): Promise<void> {
    // Redis TTL handles expiration automatically
    // Only need to clean local map if Redis is not available
    if (!this.redis) {
      // In production, this would be handled by Redis TTL
      // For local development, we can implement a simple cleanup
      this.logger.debug('Local socket map cleanup (Redis not available)');
    }
  }
}


