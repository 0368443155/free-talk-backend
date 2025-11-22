import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitService } from './livekit.service';
import { LiveKitController } from './livekit.controller';
import { LiveKitWebhookController } from './livekit-webhook.controller';
import { LiveKitWebhookStatusController } from './livekit-webhook-status.controller';
import { LiveKitMonitoringController } from './livekit-monitoring.controller';
import { MeetingsModule } from '../features/meeting/meetings.module';
import { Meeting } from '../features/meeting/entities/meeting.entity';
import { MeetingParticipant } from '../features/meeting/entities/meeting-participant.entity';
import { LiveKitMetric } from '../metrics/livekit-metric.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { LiveKitEventDetail } from './entities/livekit-event-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingParticipant, LiveKitMetric, WebhookEvent, LiveKitEventDetail]),
    forwardRef(() => MeetingsModule),
  ],
  providers: [LiveKitService],
  controllers: [LiveKitController, LiveKitWebhookController, LiveKitWebhookStatusController, LiveKitMonitoringController],
  exports: [LiveKitService],
})
export class LiveKitModule { }