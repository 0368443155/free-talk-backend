import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './services/queue.service';
import { EmailProcessor } from './processors/email.processor';
import { RecordingProcessor } from './processors/recording.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'recording' },
      { name: 'analytics' },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    RecordingProcessor,
    AnalyticsProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

