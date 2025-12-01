import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { EngagementMetric } from './entities/engagement-metric.entity';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, EngagementMetric]),
    ScheduleModule.forRoot(),
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

