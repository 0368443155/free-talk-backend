import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Injectable()
export class SessionCacheService {
  private readonly KEY_PREFIX = 'session:';
  private readonly DEFAULT_TTL = 1800; // 30 minutes

  constructor(private readonly cache: RedisCacheService) {}

  /**
   * Get session data
   */
  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `${this.KEY_PREFIX}${sessionId}`;
    return this.cache.get<T>(key);
  }

  /**
   * Set session data
   */
  async setSession<T>(sessionId: string, data: T, ttl?: number): Promise<void> {
    const key = `${this.KEY_PREFIX}${sessionId}`;
    await this.cache.set(key, data, ttl || this.DEFAULT_TTL);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.KEY_PREFIX}${sessionId}`;
    await this.cache.delete(key);
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string, ttl?: number): Promise<void> {
    const key = `${this.KEY_PREFIX}${sessionId}`;
    await this.cache.expire(key, ttl || this.DEFAULT_TTL);
  }
}

