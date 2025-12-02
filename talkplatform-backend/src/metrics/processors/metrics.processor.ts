import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { MetricsHourly } from '../entities/metrics-hourly.entity';
import { MetricRecord } from '../services/metrics-collector.service';

interface AggregatedMetric {
  endpoint: string;
  method: string;
  totalRequests: number;
  totalInbound: number;
  totalOutbound: number;
  totalResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorCount: number;
  successCount: number;
}

@Processor('metrics')
export class MetricsProcessor {
  private readonly logger = new Logger(MetricsProcessor.name);
  private readonly BUFFER_KEY = 'metrics:buffer';
  private readonly REALTIME_KEY = 'metrics:realtime';
  private readonly BATCH_SIZE = 100;
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(MetricsHourly)
    private readonly metricsRepo: Repository<MetricsHourly>,
  ) {}
  
  /**
   * Process metrics buffer every 5 seconds
   */
  @Process('process-buffer')
  async processBuffer(job: Job) {
    const startTime = Date.now();
    
    try {
      // 1. Pop batch from Redis List
      const batch = await this.popBatch();
      
      if (batch.length === 0) {
        this.logger.debug('No metrics to process');
        return { processed: 0 };
      }
      
      this.logger.log(`Processing ${batch.length} metrics`);
      
      // 2. Aggregate by endpoint
      const aggregated = this.aggregateMetrics(batch);
      
      // 3. Update Redis Hash (real-time view for dashboard)
      await this.updateRealtimeView(aggregated);
      
      // 4. Check if should persist to MySQL (every 1 minute)
      const shouldPersist = await this.shouldPersist();
      if (shouldPersist) {
        await this.persistToDatabase(aggregated);
      }
      
      const duration = Date.now() - startTime;
      this.logger.log(`Processed ${batch.length} metrics in ${duration}ms`);
      
      return { processed: batch.length, duration };
      
    } catch (error) {
      this.logger.error('Failed to process metrics:', error);
      throw error; // Bull will retry
    }
  }
  
  private async popBatch(): Promise<MetricRecord[]> {
    const items: string[] = [];
    
    // Pop up to BATCH_SIZE items
    for (let i = 0; i < this.BATCH_SIZE; i++) {
      const item = await this.redis.rpop(this.BUFFER_KEY);
      if (!item) break;
      items.push(item);
    }
    
    return items.map(item => {
      const parsed = JSON.parse(item);
      // Convert timestamp string back to Date if needed
      if (parsed.timestamp && typeof parsed.timestamp === 'string') {
        parsed.timestamp = new Date(parsed.timestamp);
      }
      return parsed;
    });
  }
  
  private aggregateMetrics(batch: MetricRecord[]): Map<string, AggregatedMetric> {
    const map = new Map<string, AggregatedMetric>();
    
    for (const metric of batch) {
      const key = `${metric.endpoint}:${metric.method}`;
      
      if (!map.has(key)) {
        map.set(key, {
          endpoint: metric.endpoint,
          method: metric.method,
          totalRequests: 0,
          totalInbound: 0,
          totalOutbound: 0,
          totalResponseTime: 0,
          maxResponseTime: 0,
          minResponseTime: Infinity,
          errorCount: 0,
          successCount: 0,
        });
      }
      
      const agg = map.get(key)!;
      agg.totalRequests++;
      agg.totalInbound += metric.requestSize;
      agg.totalOutbound += metric.responseSize;
      agg.totalResponseTime += metric.responseTime;
      agg.maxResponseTime = Math.max(agg.maxResponseTime, metric.responseTime);
      agg.minResponseTime = Math.min(agg.minResponseTime, metric.responseTime);
      
      if (metric.statusCode >= 400) {
        agg.errorCount++;
      } else {
        agg.successCount++;
      }
    }
    
    return map;
  }
  
  private async updateRealtimeView(aggregated: Map<string, AggregatedMetric>) {
    const pipeline = this.redis.pipeline();
    
    for (const [key, metric] of aggregated.entries()) {
      const hashKey = `${this.REALTIME_KEY}:${key}`;
      
      // Increment existing values or set new ones
      pipeline.hincrby(hashKey, 'totalRequests', metric.totalRequests);
      pipeline.hincrby(hashKey, 'totalInbound', metric.totalInbound);
      pipeline.hincrby(hashKey, 'totalOutbound', metric.totalOutbound);
      pipeline.hincrby(hashKey, 'errorCount', metric.errorCount);
      
      // Set max/avg (overwrite)
      pipeline.hset(hashKey, {
        avgResponseTime: (metric.totalResponseTime / metric.totalRequests).toFixed(2),
        maxResponseTime: metric.maxResponseTime.toString(),
      });
      
      // Set TTL (5 minutes)
      pipeline.expire(hashKey, 300);
    }
    
    await pipeline.exec();
  }
  
  private async shouldPersist(): Promise<boolean> {
    const lastPersist = await this.redis.get('metrics:last_persist');
    const now = Date.now();
    
    if (!lastPersist || now - parseInt(lastPersist) > 60000) { // 1 minute
      await this.redis.set('metrics:last_persist', now.toString());
      return true;
    }
    
    return false;
  }
  
  private async persistToDatabase(aggregated: Map<string, AggregatedMetric>) {
    const hourStart = this.getHourStart(new Date());
    
    for (const metric of aggregated.values()) {
      await this.metricsRepo
        .createQueryBuilder()
        .insert()
        .into(MetricsHourly)
        .values({
          endpoint: metric.endpoint,
          method: metric.method,
          protocol: 'http',
          hour_start: hourStart,
          total_requests: metric.totalRequests,
          total_inbound: metric.totalInbound,
          total_outbound: metric.totalOutbound,
          avg_response_time: metric.totalResponseTime / metric.totalRequests,
          max_response_time: metric.maxResponseTime,
          min_response_time: metric.minResponseTime === Infinity ? 0 : metric.minResponseTime,
          error_count: metric.errorCount,
          success_count: metric.successCount,
        })
        .orUpdate(
          [
            'total_requests',
            'total_inbound',
            'total_outbound',
            'avg_response_time',
            'max_response_time',
            'min_response_time',
            'error_count',
            'success_count',
          ],
          ['endpoint', 'method', 'hour_start'],
        )
        .execute();
    }
    
    this.logger.log(`Persisted ${aggregated.size} aggregated metrics to database`);
  }
  
  private getHourStart(date: Date): Date {
    const hour = new Date(date);
    hour.setMinutes(0, 0, 0);
    hour.setSeconds(0, 0);
    hour.setMilliseconds(0);
    return hour;
  }
}

