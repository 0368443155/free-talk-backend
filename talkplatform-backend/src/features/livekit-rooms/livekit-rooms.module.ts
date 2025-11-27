import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitRoomsController } from './livekit-rooms.controller';
import { LiveKitRoomsService } from './livekit-rooms.service';
import { Meeting } from '../meeting/entities/meeting.entity';
import { MeetingParticipant } from '../meeting/entities/meeting-participant.entity';
import { MeetingSettings } from '../meeting/entities/meeting-settings.entity';
import { MeetingTag } from '../meeting/entities/meeting-tag.entity';
import { BlockedParticipant } from '../meeting/entities/blocked-participant.entity';
import { User } from '../../users/user.entity';
import { LiveKitModule } from '../../livekit/livekit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingParticipant, MeetingSettings, MeetingTag, BlockedParticipant, User]),
    forwardRef(() => LiveKitModule)
  ],
  controllers: [LiveKitRoomsController],
  providers: [LiveKitRoomsService],
  exports: [LiveKitRoomsService]
})
export class LiveKitRoomsModule {}