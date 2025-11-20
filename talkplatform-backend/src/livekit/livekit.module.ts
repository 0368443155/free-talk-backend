import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitService } from './livekit.service';
import { LiveKitController } from './livekit.controller';
import { LiveKitWebhookController } from './livekit-webhook.controller';
import { MeetingsModule } from '../features/meeting/meetings.module';
import { Meeting } from '../features/meeting/entities/meeting.entity';
import { MeetingParticipant } from '../features/meeting/entities/meeting-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingParticipant]),
    forwardRef(() => MeetingsModule),
  ],
  providers: [LiveKitService],
  controllers: [LiveKitController, LiveKitWebhookController],
  exports: [LiveKitService],
})
export class LiveKitModule { }