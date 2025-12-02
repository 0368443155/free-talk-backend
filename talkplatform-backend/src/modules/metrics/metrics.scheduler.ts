import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

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

