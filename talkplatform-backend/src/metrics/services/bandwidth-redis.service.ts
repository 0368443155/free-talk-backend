import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CreateMetricDto } from '../dto/create-metric.dto';

/**
 * Redis Service for Bandwidth Metrics
 * Handles:
 * - Real-time bandwidth metrics caching
 * - Aggregated metrics for dashboard
 * - Time-series data storage
 */
@Injectable()
export class BandwidthRedisService {
  private readonly logger = new Logger(BandwidthRedisService.name);

  // Redis key prefixes
  private readonly METRIC_KEY = 'bandwidth:metric:';
  private readonly AGGREGATE_KEY = 'bandwidth:aggregate:';
  private readonly REALTIME_KEY = 'bandwidth:realtime';
  private readonly TIMESERIES_KEY = 'bandwidth:timeseries:';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Store bandwidth metric in Redis (for real-time access)
   */
  async storeMetric(metric: CreateMetricDto): Promise<void> {
    try {
      const timestamp = Date.now();
      const key = `${this.METRIC_KEY}${timestamp}:${metric.endpoint}`;
      
      // Store metric with 1 hour TTL
      await this.redis.setex(
        key,
        3600,
        JSON.stringify({
          ...metric,
          timestamp: new Date(timestamp),
        })
      );

      // Update real-time aggregate
      await this.updateRealtimeAggregate(metric);

      // Store in time-series (for historical analysis)
      await this.addToTimeSeries(metric, timestamp);
    } catch (error) {
      this.logger.error(`❌ Failed to store metric in Redis: ${error.message}`);
    }
  }

  /**
   * Update real-time aggregate metrics
   */
  private async updateRealtimeAggregate(metric: CreateMetricDto): Promise<void> {
    try {
      const key = this.REALTIME_KEY;
      
      // Use Redis hash to store aggregated metrics
      await this.redis.hincrby(key, 'totalInbound', metric.inboundBytes);
      await this.redis.hincrby(key, 'totalOutbound', metric.outboundBytes);
      await this.redis.hincrby(key, 'requestCount', 1);
      await this.redis.hincrby(key, 'totalResponseTime', metric.responseTimeMs);
      
      // Update max connections
      const currentMax = await this.redis.hget(key, 'maxConnections');
      if (!currentMax || parseInt(currentMax) < metric.activeConnections) {
        await this.redis.hset(key, 'maxConnections', metric.activeConnections);
      }

      // Set expiration (refresh every hour)
      await this.redis.expire(key, 3600);
    } catch (error) {
      this.logger.error(`❌ Failed to update realtime aggregate: ${error.message}`);
    }
  }

  /**
   * Add metric to time-series (sorted set by timestamp)
   */
  private async addToTimeSeries(metric: CreateMetricDto, timestamp: number): Promise<void> {
    try {
      const score = timestamp;
      const value = JSON.stringify({
        endpoint: metric.endpoint,
        inbound: metric.inboundBytes,
        outbound: metric.outboundBytes,
        responseTime: metric.responseTimeMs,
      });

      // Use sorted set for time-series data
      await this.redis.zadd(
        `${this.TIMESERIES_KEY}${metric.endpoint}`,
        score,
        value
      );

      // Keep only last 24 hours of data (cleanup old entries)
      const oneDayAgo = timestamp - 24 * 60 * 60 * 1000;
      await this.redis.zremrangebyscore(
        `${this.TIMESERIES_KEY}${metric.endpoint}`,
        0,
        oneDayAgo
      );
    } catch (error) {
      this.logger.error(`❌ Failed to add to time-series: ${error.message}`);
    }
  }

  /**
   * Get real-time aggregate metrics
   */
  async getRealtimeMetrics(): Promise<{
    totalInbound: number;
    totalOutbound: number;
    requestCount: number;
    avgResponseTime: number;
    maxConnections: number;
  }> {
    try {
      const data = await this.redis.hgetall(this.REALTIME_KEY);
      
      const totalInbound = parseInt(data.totalInbound || '0', 10);
      const totalOutbound = parseInt(data.totalOutbound || '0', 10);
      const requestCount = parseInt(data.requestCount || '0', 10);
      const totalResponseTime = parseInt(data.totalResponseTime || '0', 10);
      const maxConnections = parseInt(data.maxConnections || '0', 10);

      return {
        totalInbound,
        totalOutbound,
        requestCount,
        avgResponseTime: requestCount > 0 ? Math.round(totalResponseTime / requestCount) : 0,
        maxConnections,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get realtime metrics: ${error.message}`);
      return {
        totalInbound: 0,
        totalOutbound: 0,
        requestCount: 0,
        avgResponseTime: 0,
        maxConnections: 0,
      };
    }
  }

  /**
   * Get time-series data for an endpoint
   */
  async getTimeSeriesData(
    endpoint: string,
    startTime: number,
    endTime: number
  ): Promise<Array<{ timestamp: number; inbound: number; outbound: number; responseTime: number }>> {
    try {
      const key = `${this.TIMESERIES_KEY}${endpoint}`;
      const data = await this.redis.zrangebyscore(key, startTime, endTime);

      return data.map(item => JSON.parse(item));
    } catch (error) {
      this.logger.error(`❌ Failed to get time-series data: ${error.message}`);
      return [];
    }
  }

  /**
   * Reset real-time metrics (can be called periodically)
   */
  async resetRealtimeMetrics(): Promise<void> {
    try {
      await this.redis.del(this.REALTIME_KEY);
      this.logger.log('✅ Real-time metrics reset');
    } catch (error) {
      this.logger.error(`❌ Failed to reset realtime metrics: ${error.message}`);
    }
  }

  /**
   * Get aggregated metrics by endpoint
   */
  async getAggregatedMetricsByEndpoint(timeWindowMinutes: number = 5): Promise<
    Array<{
      endpoint: string;
      totalInbound: number;
      totalOutbound: number;
      requestCount: number;
      avgResponseTime: number;
    }>
  > {
    try {
      const now = Date.now();
      const startTime = now - timeWindowMinutes * 60 * 1000;

      // Get all endpoint keys
      const keys = await this.redis.keys(`${this.TIMESERIES_KEY}*`);
      const results: Array<{
        endpoint: string;
        totalInbound: number;
        totalOutbound: number;
        requestCount: number;
        avgResponseTime: number;
      }> = [];

      for (const key of keys) {
        const endpoint = key.replace(this.TIMESERIES_KEY, '');
        const data = await this.getTimeSeriesData(endpoint, startTime, now);

        if (data.length > 0) {
          const totalInbound = data.reduce((sum, d) => sum + d.inbound, 0);
          const totalOutbound = data.reduce((sum, d) => sum + d.outbound, 0);
          const totalResponseTime = data.reduce((sum, d) => sum + d.responseTime, 0);

          results.push({
            endpoint,
            totalInbound,
            totalOutbound,
            requestCount: data.length,
            avgResponseTime: Math.round(totalResponseTime / data.length),
          });
        }
      }

      return results.sort((a, b) => (b.totalInbound + b.totalOutbound) - (a.totalInbound + a.totalOutbound));
    } catch (error) {
      this.logger.error(`❌ Failed to get aggregated metrics: ${error.message}`);
      return [];
    }
  }
}
