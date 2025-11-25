import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { GlobalChatMessage } from '../entities/global-chat-message.entity';

/**
 * Redis Service for Global Chat
 * Handles:
 * - User online/offline status (for cross-instance sync)
 * - Message caching
 * - Rate limiting
 * - Online users count
 */
@Injectable()
export class GlobalChatRedisService {
  private readonly logger = new Logger(GlobalChatRedisService.name);

  // Redis key prefixes
  private readonly USER_ONLINE_KEY = 'global-chat:user-online:';
  private readonly USER_SOCKET_KEY = 'global-chat:user-socket:';
  private readonly ONLINE_USERS_SET = 'global-chat:online-users';
  private readonly MESSAGE_CACHE_KEY = 'global-chat:message:';
  private readonly RATE_LIMIT_KEY = 'global-chat:rate-limit:';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Mark user as online in Redis
   */
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Store user online status with socket ID
      await this.redis.setex(
        `${this.USER_ONLINE_KEY}${userId}`,
        3600, // 1 hour TTL
        JSON.stringify({ socketId, timestamp, online: true })
      );

      // Store socket ID to userId mapping
      await this.redis.setex(
        `${this.USER_SOCKET_KEY}${socketId}`,
        3600,
        userId
      );

      // Add to online users set
      await this.redis.sadd(this.ONLINE_USERS_SET, userId);
      
      // Set expiration on the set (refresh on each connection)
      await this.redis.expire(this.ONLINE_USERS_SET, 3600);

      this.logger.debug(`✅ User ${userId} marked as online (socket: ${socketId})`);
    } catch (error) {
      this.logger.error(`❌ Failed to set user online: ${error.message}`);
    }
  }

  /**
   * Mark user as offline in Redis
   */
  async setUserOffline(userId: string): Promise<void> {
    try {
      // Remove user online status
      await this.redis.del(`${this.USER_ONLINE_KEY}${userId}`);

      // Remove from online users set
      await this.redis.srem(this.ONLINE_USERS_SET, userId);

      this.logger.debug(`👋 User ${userId} marked as offline`);
    } catch (error) {
      this.logger.error(`❌ Failed to set user offline: ${error.message}`);
    }
  }

  /**
   * Get user's socket ID from Redis
   */
  async getUserSocketId(userId: string): Promise<string | null> {
    try {
      const data = await this.redis.get(`${this.USER_ONLINE_KEY}${userId}`);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return parsed.socketId || null;
    } catch (error) {
      this.logger.error(`❌ Failed to get user socket ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Get userId from socket ID
   */
  async getUserIdFromSocket(socketId: string): Promise<string | null> {
    try {
      return await this.redis.get(`${this.USER_SOCKET_KEY}${socketId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to get userId from socket: ${error.message}`);
      return null;
    }
  }

  /**
   * Get count of online users
   */
  async getOnlineUsersCount(): Promise<number> {
    try {
      return await this.redis.scard(this.ONLINE_USERS_SET);
    } catch (error) {
      this.logger.error(`❌ Failed to get online users count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get list of online user IDs
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      return await this.redis.smembers(this.ONLINE_USERS_SET);
    } catch (error) {
      this.logger.error(`❌ Failed to get online users: ${error.message}`);
      return [];
    }
  }

  /**
   * Cache a message in Redis
   */
  async cacheMessage(messageId: string, message: GlobalChatMessage, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(
        `${this.MESSAGE_CACHE_KEY}${messageId}`,
        ttl,
        JSON.stringify(message)
      );
    } catch (error) {
      this.logger.error(`❌ Failed to cache message: ${error.message}`);
    }
  }

  /**
   * Get cached message from Redis
   */
  async getCachedMessage(messageId: string): Promise<GlobalChatMessage | null> {
    try {
      const data = await this.redis.get(`${this.MESSAGE_CACHE_KEY}${messageId}`);
      if (!data) return null;

      return JSON.parse(data) as GlobalChatMessage;
    } catch (error) {
      this.logger.error(`❌ Failed to get cached message: ${error.message}`);
      return null;
    }
  }

  /**
   * Rate limiting for chat messages
   * @param userId User ID
   * @param maxMessages Maximum messages allowed
   * @param windowSeconds Time window in seconds
   * @returns Rate limit info
   */
  async checkRateLimit(
    userId: string,
    maxMessages: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const key = `${this.RATE_LIMIT_KEY}${userId}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        // First request in window, set expiration
        await this.redis.expire(key, windowSeconds);
      }

      const ttl = await this.redis.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);
      const remaining = Math.max(0, maxMessages - current);

      return {
        allowed: current <= maxMessages,
        remaining,
        resetAt,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to check rate limit: ${error.message}`);
      // Allow on error (fail open)
      return {
        allowed: true,
        remaining: maxMessages,
        resetAt: new Date(Date.now() + 60 * 1000),
      };
    }
  }

  /**
   * Clean up expired keys (can be called periodically)
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      // Redis automatically expires keys, but we can manually clean up if needed
      // This is mainly for logging/monitoring
      const onlineCount = await this.getOnlineUsersCount();
      this.logger.debug(`🧹 Cleanup: ${onlineCount} users currently online`);
      return onlineCount;
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup expired keys: ${error.message}`);
      return 0;
    }
  }
}
