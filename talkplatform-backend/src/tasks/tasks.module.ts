import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { SystemHealthService } from './system-health.service';
import { AppService } from '../app.service';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot()
  ],
  providers: [AppService, TasksService, SystemHealthService],
  exports: [TasksService, SystemHealthService]
})
export class TasksModule {}