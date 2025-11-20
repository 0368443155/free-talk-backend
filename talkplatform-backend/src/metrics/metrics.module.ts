import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { BandwidthMetric } from './bandwidth-metric.entity';
import { MetricsHourly } from './metrics-hourly.entity';
import { LiveKitMetric } from './livekit-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BandwidthMetric, MetricsHourly, LiveKitMetric]),
    HttpModule
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService]
})
export class MetricsModule {}