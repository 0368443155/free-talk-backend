import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MeetingMetricsController } from './meeting-metrics.controller';
import { BandwidthRedisService } from './services/bandwidth-redis.service';
import { MetricsCollector } from './services/metrics-collector.service';
import { MetricsProcessor } from './processors/metrics.processor';
import { MetricsScheduler } from './metrics.scheduler';
import { BandwidthMetric } from './bandwidth-metric.entity';
import { MetricsHourly } from './entities/metrics-hourly.entity';
import { MetricsDaily } from './entities/metrics-daily.entity';
import { BandwidthAlert } from './entities/bandwidth-alert.entity';
import { LiveKitMetric } from './livekit-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BandwidthMetric, 
      MetricsHourly, 
      MetricsDaily,
      BandwidthAlert,
      LiveKitMetric
    ]),
    RedisModule, // Add Redis for bandwidth monitoring
    HttpModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueueAsync({
      name: 'metrics',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 🔥 FIX 2: Redis configuration for long-running jobs
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB') || 0,
          maxRetriesPerRequest: null, // Prevent connection close
          enableReadyCheck: false,
        },
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
    }),
  ],
  controllers: [MetricsController, MeetingMetricsController],
  providers: [
    MetricsService, 
    BandwidthRedisService,
    MetricsCollector,
    MetricsProcessor,
    MetricsScheduler,
  ],
  exports: [
    MetricsService, 
    BandwidthRedisService,
    MetricsCollector, // Export for middleware
  ]
})
export class MetricsModule {}