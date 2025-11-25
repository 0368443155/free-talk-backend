import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { BandwidthRedisService } from './services/bandwidth-redis.service';
import { BandwidthMetric } from './bandwidth-metric.entity';
import { MetricsHourly } from './metrics-hourly.entity';
import { LiveKitMetric } from './livekit-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BandwidthMetric, MetricsHourly, LiveKitMetric]),
    RedisModule, // Add Redis for bandwidth monitoring
    HttpModule
  ],
  controllers: [MetricsController],
  providers: [MetricsService, BandwidthRedisService],
  exports: [MetricsService, BandwidthRedisService]
})
export class MetricsModule {}