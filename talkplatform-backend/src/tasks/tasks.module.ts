import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TasksService } from './tasks.service';
import { SystemHealthService } from './system-health.service';
import { AppService } from '../app.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [AppService, TasksService, SystemHealthService],
  exports: [TasksService, SystemHealthService]
})
export class TasksModule { }