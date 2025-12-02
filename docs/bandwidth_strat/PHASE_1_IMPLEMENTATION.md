# 🚀 PHASE 1: HTTP/API BANDWIDTH MONITORING

**Timeline**: Week 1 (5 days)  
**Focus**: Backend - Metrics Collection & Processing  
**Goal**: Production-ready HTTP/API monitoring với batching

---

## 📋 OVERVIEW

### What We're Building:
```
Request → Middleware → Redis List → Bull Worker → MySQL
           (0.5ms)    (buffer)      (batch 5s)   (1min)
```

### Success Criteria:
- ✅ API latency < 50ms (no impact)
- ✅ Database writes < 100/minute
- ✅ Metrics accuracy > 99%
- ✅ Zero data loss

---

## 📅 DAY-BY-DAY PLAN

### **DAY 1: Setup & Middleware** (4-6 hours)

#### Step 1.1: Install Dependencies
```bash
cd talkplatform-backend

# Install required packages
npm install --save @nestjs/bull bull
npm install --save @nestjs-modules/ioredis ioredis
npm install --save @nestjs/schedule

# Install dev dependencies
npm install --save-dev @types/bull
```

#### Step 1.2: Create Metrics Module Structure
```bash
# Create directory structure
mkdir -p src/modules/metrics/services
mkdir -p src/modules/metrics/processors
mkdir -p src/modules/metrics/entities
mkdir -p src/modules/metrics/dto
mkdir -p src/common/middleware
```

#### Step 1.3: Create Metrics Middleware
**File**: `src/common/middleware/metrics.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsCollector } from '../../modules/metrics/services/metrics-collector.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsCollector: MetricsCollector) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Get request size from Content-Length header
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);
    
    // Capture original end function
    const originalEnd = res.end;
    let responseSize = 0;
    
    // Override res.end to capture response size
    res.end = function(chunk?: any, encoding?: any, callback?: any): any {
      if (chunk) {
        responseSize = Buffer.byteLength(chunk, encoding);
      }
      
      // Collect metrics (non-blocking, fire-and-forget)
      setImmediate(() => {
        metricsCollector.collect({
          endpoint: req.path,
          method: req.method,
          requestSize,
          responseSize,
          responseTime: Date.now() - startTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userId: (req as any).user?.id,
        }).catch(err => {
          // Silent fail - don't break API
          console.error('Metrics collection failed:', err);
        });
      });
      
      // Call original end
      return originalEnd.call(this, chunk, encoding, callback);
    };
    
    next();
  }
}
```

#### Step 1.4: Create Metrics Collector Service
**File**: `src/modules/metrics/services/metrics-collector.service.ts`

```typescript
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
```

#### Step 1.5: Test Middleware
**File**: `src/common/middleware/metrics.middleware.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsCollector } from '../../modules/metrics/services/metrics-collector.service';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let collector: MetricsCollector;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MetricsMiddleware,
        {
          provide: MetricsCollector,
          useValue: {
            collect: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    
    middleware = module.get(MetricsMiddleware);
    collector = module.get(MetricsCollector);
  });
  
  it('should collect metrics without blocking response', (done) => {
    const req = {
      path: '/api/test',
      method: 'GET',
      headers: { 'content-length': '100' },
    } as any;
    
    const res = {
      statusCode: 200,
      end: jest.fn(),
    } as any;
    
    const next = jest.fn();
    
    middleware.use(req, res, next);
    
    expect(next).toHaveBeenCalled();
    
    // Simulate response
    res.end('test response');
    
    // Metrics should be collected asynchronously
    setTimeout(() => {
      expect(collector.collect).toHaveBeenCalled();
      done();
    }, 10);
  });
});
```

**✅ Day 1 Checklist:**
- [ ] Dependencies installed
- [ ] Middleware created
- [ ] Collector service created
- [ ] Unit tests passing
- [ ] Code reviewed

---

### **DAY 2: Database Schema & Entities** (4-6 hours)

#### Step 2.1: Create Migration
**File**: `src/migrations/1733112000000-create-metrics-tables.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetricsTables1733112000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hourly aggregates (long-term storage)
    await queryRunner.query(`
      CREATE TABLE metrics_hourly (
        id VARCHAR(36) PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        protocol ENUM('http', 'webrtc') DEFAULT 'http',
        hour_start TIMESTAMP NOT NULL,
        total_requests INT DEFAULT 0,
        total_inbound BIGINT DEFAULT 0,
        total_outbound BIGINT DEFAULT 0,
        avg_response_time DECIMAL(10,2) DEFAULT 0,
        max_response_time INT DEFAULT 0,
        min_response_time INT DEFAULT 0,
        error_count INT DEFAULT 0,
        success_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_endpoint_hour (endpoint, method, hour_start),
        INDEX idx_hour_start (hour_start),
        INDEX idx_protocol (protocol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Daily aggregates (for reports)
    await queryRunner.query(`
      CREATE TABLE metrics_daily (
        id VARCHAR(36) PRIMARY KEY,
        date DATE NOT NULL,
        protocol ENUM('http', 'webrtc') DEFAULT 'http',
        total_bandwidth BIGINT DEFAULT 0,
        total_requests INT DEFAULT 0,
        avg_response_time DECIMAL(10,2) DEFAULT 0,
        peak_bandwidth BIGINT DEFAULT 0,
        peak_hour TIMESTAMP,
        unique_users INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_date_protocol (date, protocol),
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Bandwidth alerts
    await queryRunner.query(`
      CREATE TABLE bandwidth_alerts (
        id VARCHAR(36) PRIMARY KEY,
        alert_type ENUM('threshold', 'spike', 'anomaly') NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        message TEXT NOT NULL,
        metric_value BIGINT NOT NULL,
        threshold_value BIGINT,
        endpoint VARCHAR(255),
        protocol ENUM('http', 'webrtc'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        INDEX idx_created (created_at),
        INDEX idx_severity (severity),
        INDEX idx_protocol (protocol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bandwidth_alerts`);
    await queryRunner.query(`DROP TABLE IF EXISTS metrics_daily`);
    await queryRunner.query(`DROP TABLE IF EXISTS metrics_hourly`);
  }
}
```

#### Step 2.2: Create Entities
**File**: `src/modules/metrics/entities/metrics-hourly.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('metrics_hourly')
@Index(['endpoint', 'method', 'hour_start'], { unique: true })
export class MetricsHourly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'enum', enum: ['http', 'webrtc'], default: 'http' })
  protocol: string;

  @Column({ type: 'timestamp' })
  @Index()
  hour_start: Date;

  @Column({ type: 'int', default: 0 })
  total_requests: number;

  @Column({ type: 'bigint', default: 0 })
  total_inbound: number;

  @Column({ type: 'bigint', default: 0 })
  total_outbound: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avg_response_time: number;

  @Column({ type: 'int', default: 0 })
  max_response_time: number;

  @Column({ type: 'int', default: 0 })
  min_response_time: number;

  @Column({ type: 'int', default: 0 })
  error_count: number;

  @Column({ type: 'int', default: 0 })
  success_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

**File**: `src/modules/metrics/entities/metrics-daily.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('metrics_daily')
@Index(['date', 'protocol'], { unique: true })
export class MetricsDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({ type: 'enum', enum: ['http', 'webrtc'], default: 'http' })
  protocol: string;

  @Column({ type: 'bigint', default: 0 })
  total_bandwidth: number;

  @Column({ type: 'int', default: 0 })
  total_requests: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avg_response_time: number;

  @Column({ type: 'bigint', default: 0 })
  peak_bandwidth: number;

  @Column({ type: 'timestamp', nullable: true })
  peak_hour: Date;

  @Column({ type: 'int', default: 0 })
  unique_users: number;

  @CreateDateColumn()
  created_at: Date;
}
```

#### Step 2.3: Run Migration
```bash
# Generate migration
npm run typeorm migration:generate -- -n CreateMetricsTables

# Run migration
npm run typeorm migration:run

# Verify tables created
mysql -u root -p
USE your_database;
SHOW TABLES LIKE 'metrics%';
DESCRIBE metrics_hourly;
```

**✅ Day 2 Checklist:**
- [ ] Migration created
- [ ] Entities created
- [ ] Migration executed successfully
- [ ] Tables verified in database
- [ ] Indexes created

---

### **DAY 3: Bull Queue & Worker** (6-8 hours)

#### Step 3.1: Configure Bull Module
**File**: `src/modules/metrics/metrics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsCollector } from './services/metrics-collector.service';
import { MetricsProcessor } from './processors/metrics.processor';
import { MetricsHourly } from './entities/metrics-hourly.entity';
import { MetricsDaily } from './entities/metrics-daily.entity';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetricsHourly, MetricsDaily]),
    BullModule.registerQueue({
      name: 'metrics',
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500,     // Keep last 500 failed jobs
        attempts: 3,           // Retry 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsCollector,
    MetricsProcessor,
  ],
  exports: [MetricsCollector],
})
export class MetricsModule {}
```

#### Step 3.2: Create Metrics Processor
**File**: `src/modules/metrics/processors/metrics.processor.ts`

```typescript
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
    
    return items.map(item => JSON.parse(item));
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
        maxResponseTime: metric.maxResponseTime,
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
    return hour;
  }
}
```

#### Step 3.3: Create Scheduler
**File**: `src/modules/metrics/metrics.scheduler.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);
  
  constructor(
    @InjectQueue('metrics') private readonly metricsQueue: Queue,
  ) {}
  
  // Process buffer every 5 seconds
  @Cron('*/5 * * * * *')
  async processBuffer() {
    try {
      await this.metricsQueue.add('process-buffer', {}, {
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.error('Failed to queue metrics processing:', error);
    }
  }
}
```

**✅ Day 3 Checklist:**
- [ ] Bull module configured
- [ ] Processor created
- [ ] Scheduler created
- [ ] Worker tested locally
- [ ] Redis verified

---

### **DAY 4: Integration & API** (4-6 hours)

#### Step 4.1: Register Middleware in App Module
**File**: `src/app.module.ts`

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MetricsMiddleware } from './common/middleware/metrics.middleware';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    // ... existing imports
    MetricsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

#### Step 4.2: Create Metrics Controller
**File**: `src/modules/metrics/metrics.controller.ts`

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import Redis from 'ioredis';
import { MetricsHourly } from './entities/metrics-hourly.entity';

@Controller('metrics')
export class MetricsController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(MetricsHourly)
    private readonly metricsRepo: Repository<MetricsHourly>,
  ) {}
  
  /**
   * Get real-time metrics (last 5 minutes from Redis)
   */
  @Get('realtime')
  async getRealtime() {
    const keys = await this.redis.keys('metrics:realtime:*');
    const metrics = [];
    
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      const parts = key.split(':');
      const endpoint = parts[2];
      const method = parts[3];
      
      metrics.push({
        endpoint,
        method,
        totalRequests: parseInt(data.totalRequests || '0'),
        totalInbound: parseInt(data.totalInbound || '0'),
        totalOutbound: parseInt(data.totalOutbound || '0'),
        avgResponseTime: parseFloat(data.avgResponseTime || '0'),
        maxResponseTime: parseInt(data.maxResponseTime || '0'),
        errorCount: parseInt(data.errorCount || '0'),
      });
    }
    
    return {
      endpoints: metrics,
      summary: this.calculateSummary(metrics),
    };
  }
  
  /**
   * Get hourly aggregates (last N hours from MySQL)
   */
  @Get('hourly')
  async getHourly(@Query('hours') hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    return this.metricsRepo.find({
      where: {
        hour_start: MoreThanOrEqual(since),
      },
      order: {
        hour_start: 'DESC',
      },
    });
  }
  
  /**
   * Get buffer status (for monitoring)
   */
  @Get('status')
  async getStatus() {
    const bufferSize = await this.redis.llen('metrics:buffer');
    const lastPersist = await this.redis.get('metrics:last_persist');
    
    return {
      bufferSize,
      lastPersist: lastPersist ? new Date(parseInt(lastPersist)) : null,
      status: bufferSize < 5000 ? 'healthy' : 'warning',
    };
  }
  
  private calculateSummary(metrics: any[]) {
    return {
      totalBandwidth: metrics.reduce((sum, m) => sum + m.totalInbound + m.totalOutbound, 0),
      totalRequests: metrics.reduce((sum, m) => sum + m.totalRequests, 0),
      avgResponseTime: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
        : 0,
    };
  }
}
```

**✅ Day 4 Checklist:**
- [ ] Middleware registered globally
- [ ] Controller created
- [ ] API endpoints tested
- [ ] Real-time metrics working
- [ ] Historical data accessible

---

### **DAY 5: Testing & Monitoring** (6-8 hours)

#### Step 5.1: Load Testing Script
**File**: `scripts/test-metrics.ts`

```typescript
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 100;
const DURATION_SECONDS = 60;

async function loadTest() {
  console.log(`Starting load test: ${CONCURRENT_REQUESTS} concurrent requests for ${DURATION_SECONDS}s`);
  
  const startTime = Date.now();
  let totalRequests = 0;
  
  const interval = setInterval(async () => {
    const promises = [];
    
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(
        axios.get(`${BASE_URL}/api/courses`)
          .then(() => totalRequests++)
          .catch(err => console.error('Request failed:', err.message))
      );
    }
    
    await Promise.all(promises);
    
    if (Date.now() - startTime > DURATION_SECONDS * 1000) {
      clearInterval(interval);
      console.log(`\nLoad test completed!`);
      console.log(`Total requests: ${totalRequests}`);
      console.log(`Requests/second: ${(totalRequests / DURATION_SECONDS).toFixed(2)}`);
      
      // Check metrics
      await checkMetrics();
    }
  }, 1000);
}

async function checkMetrics() {
  console.log('\nChecking metrics...');
  
  // Real-time metrics
  const realtime = await axios.get(`${BASE_URL}/metrics/realtime`);
  console.log('Real-time metrics:', JSON.stringify(realtime.data.summary, null, 2));
  
  // Buffer status
  const status = await axios.get(`${BASE_URL}/metrics/status`);
  console.log('Buffer status:', JSON.stringify(status.data, null, 2));
  
  // Hourly metrics
  const hourly = await axios.get(`${BASE_URL}/metrics/hourly?hours=1`);
  console.log(`Hourly metrics: ${hourly.data.length} records`);
}

loadTest();
```

Run test:
```bash
ts-node scripts/test-metrics.ts
```

#### Step 5.2: Monitoring Dashboard (Simple)
**File**: `scripts/monitor-metrics.ts`

```typescript
import axios from 'axios';
import * as readline from 'readline';

const BASE_URL = 'http://localhost:3000';

async function monitor() {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  
  const status = await axios.get(`${BASE_URL}/metrics/status`);
  const realtime = await axios.get(`${BASE_URL}/metrics/realtime`);
  
  console.log('=== METRICS MONITOR ===\n');
  console.log(`Buffer Size: ${status.data.bufferSize}`);
  console.log(`Status: ${status.data.status}`);
  console.log(`Last Persist: ${status.data.lastPersist}\n`);
  
  console.log('Real-time Summary:');
  console.log(`  Total Bandwidth: ${formatBytes(realtime.data.summary.totalBandwidth)}`);
  console.log(`  Total Requests: ${realtime.data.summary.totalRequests}`);
  console.log(`  Avg Response: ${realtime.data.summary.avgResponseTime.toFixed(2)}ms\n`);
  
  console.log('Top Endpoints:');
  realtime.data.endpoints
    .sort((a, b) => (b.totalInbound + b.totalOutbound) - (a.totalInbound + a.totalOutbound))
    .slice(0, 5)
    .forEach(e => {
      console.log(`  ${e.method} ${e.endpoint}: ${formatBytes(e.totalInbound + e.totalOutbound)}`);
    });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Update every 2 seconds
setInterval(monitor, 2000);
monitor();
```

Run monitor:
```bash
ts-node scripts/monitor-metrics.ts
```

#### Step 5.3: Verify Database
```sql
-- Check hourly metrics
SELECT 
  endpoint,
  method,
  total_requests,
  total_inbound + total_outbound as total_bandwidth,
  avg_response_time,
  hour_start
FROM metrics_hourly
ORDER BY hour_start DESC
LIMIT 10;

-- Check top consumers
SELECT 
  endpoint,
  SUM(total_inbound + total_outbound) as total_bandwidth,
  SUM(total_requests) as total_requests
FROM metrics_hourly
WHERE hour_start >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY endpoint
ORDER BY total_bandwidth DESC
LIMIT 10;
```

**✅ Day 5 Checklist:**
- [ ] Load test passed (1000+ req/s)
- [ ] API latency < 50ms
- [ ] Database writes < 100/min
- [ ] Redis buffer stable
- [ ] Metrics accurate
- [ ] Monitoring working

---

## 📊 PHASE 1 SUCCESS METRICS

### Performance:
- ✅ API latency: **< 50ms** (target: +0.5ms)
- ✅ Database writes: **< 100/minute** (target: 10/min)
- ✅ Buffer size: **< 5000** items
- ✅ Memory usage: **< 100MB**

### Accuracy:
- ✅ Metrics collected: **> 99%** of requests
- ✅ Data loss: **< 0.1%**
- ✅ Aggregation accuracy: **100%**

### Reliability:
- ✅ Worker uptime: **> 99.9%**
- ✅ Redis availability: **100%**
- ✅ MySQL availability: **100%**

---

## 🚨 TROUBLESHOOTING

### Issue 1: High Buffer Size
**Symptom**: Buffer > 5000 items  
**Cause**: Worker not processing fast enough  
**Solution**:
```bash
# Check worker status
pm2 logs metrics-worker

# Increase batch size
METRICS_BATCH_SIZE=200

# Add more workers
pm2 scale metrics-worker +2
```

### Issue 2: Missing Metrics
**Symptom**: Some requests not tracked  
**Cause**: Middleware not applied  
**Solution**:
```typescript
// Verify middleware in app.module.ts
consumer.apply(MetricsMiddleware).forRoutes('*');
```

### Issue 3: High API Latency
**Symptom**: API response > 50ms  
**Cause**: Blocking metrics collection  
**Solution**:
```typescript
// Ensure fire-and-forget pattern
setImmediate(() => {
  metricsCollector.collect(metric);
});
```

---

## 📝 DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] All tests passing
- [ ] Load test completed
- [ ] Database migration ready
- [ ] Redis configured
- [ ] Bull queue configured
- [ ] Environment variables set

### Deployment:
- [ ] Run migration
- [ ] Deploy code
- [ ] Start worker
- [ ] Verify middleware active
- [ ] Monitor for 1 hour

### Post-deployment:
- [ ] Check API latency
- [ ] Verify metrics collection
- [ ] Check database writes
- [ ] Monitor Redis memory
- [ ] Review logs

---

## 🎯 NEXT PHASE

**Phase 2: WebRTC Meeting Monitoring**
- Web Worker implementation
- Throttling logic
- TURN detection
- Admin dashboard

**Estimated Start**: After Phase 1 stable (24 hours)

---

**Status**: ✅ **READY TO START DAY 1**  
**First Task**: Install dependencies and create middleware

Bạn sẵn sàng bắt đầu Day 1 chưa? 🚀
