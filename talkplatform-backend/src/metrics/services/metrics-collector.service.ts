import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface MetricRecord {
  endpoint: string;
  method: string;
  requestSize: number;
  responseSize: number;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
}

@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);
  private readonly BUFFER_KEY = 'metrics:buffer';
  private readonly MAX_BUFFER_SIZE = 10000;
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}
  
  /**
   * Collect metric - Non-blocking, fire-and-forget
   * Push to Redis List for batch processing
   */
  async collect(metric: MetricRecord): Promise<void> {
    try {
      // Push to Redis List (LPUSH is O(1))
      await this.redis.lpush(
        this.BUFFER_KEY,
        JSON.stringify(metric),
      );
      
      // Trim list to prevent overflow (keep last 10k items)
      await this.redis.ltrim(this.BUFFER_KEY, 0, this.MAX_BUFFER_SIZE - 1);
      
      this.logger.debug(`Metric collected: ${metric.method} ${metric.endpoint}`);
    } catch (error) {
      // Silent fail - don't break API request
      this.logger.error('Failed to collect metric:', error);
    }
  }
  
  /**
   * Get buffer size (for monitoring)
   */
  async getBufferSize(): Promise<number> {
    return this.redis.llen(this.BUFFER_KEY);
  }
}


