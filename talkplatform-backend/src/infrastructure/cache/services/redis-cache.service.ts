import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CacheConfig } from '../interfaces/cache-config.interface';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete cache keys:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) {
      return [];
    }
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (!value) {
          return null;
        }
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get multiple cache keys:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values
   */
  async setMany<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    try {
      const pipeline = this.redis.pipeline();
      entries.forEach(({ key, value, ttl }) => {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to set multiple cache keys:`, error);
      throw error;
    }
  }

  /**
   * Increment value
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      this.logger.error(`Failed to increment cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement value
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, by);
    } catch (error) {
      this.logger.error(`Failed to decrement cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set expiration on cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get TTL of key
   */
  async getTtl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL of cache key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.flushdb();
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache:`, error);
      throw error;
    }
  }
}

