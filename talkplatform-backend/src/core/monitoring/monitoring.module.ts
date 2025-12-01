import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MigrationMonitorService } from './migration-monitor.service';
import { AutoRollbackService } from './auto-rollback.service';
import { FeatureFlagModule } from '../feature-flags/feature-flag.module';

@Module({
  imports: [ScheduleModule.forRoot(), FeatureFlagModule],
  providers: [MigrationMonitorService, AutoRollbackService],
  exports: [MigrationMonitorService, AutoRollbackService],
})
export class MonitoringModule {}

