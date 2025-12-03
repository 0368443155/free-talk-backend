import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
// import { MeetingsController } from './meetings.controller'; // REMOVED: Duplicate with ClassroomsController
import { PublicMeetingsController } from './public-meetings.controller';
import { MeetingsGeneralController } from './meetings-general.controller';
import { WaitingRoomController } from './controllers/waiting-room.controller';
import { MeetingsService } from './meetings.service';
import { MeetingsGateway } from './meetings.gateway';
import { EnhancedMeetingsGateway } from './enhanced-meetings.gateway';
import { WaitingRoomService } from './services/waiting-room.service';
import { MeetingSchedulerService } from './meeting-scheduler.service';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingChatMessage } from './entities/meeting-chat-message.entity';
import { MeetingSettings } from './entities/meeting-settings.entity';
import { MeetingTag } from './entities/meeting-tag.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Booking } from '../booking/entities/booking.entity';
import { User } from '../../users/user.entity';
import { LiveKitModule } from '../../livekit/livekit.module';
import { CoursesModule } from '../courses/courses.module';
import { FeatureFlagModule } from '../../core/feature-flags/feature-flag.module';

import { ScheduleAutomationService } from './services/schedule-automation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingParticipant,
      MeetingChatMessage,
      MeetingSettings,
      MeetingTag,
      BlockedParticipant,
      Lesson,
      Booking,
      User,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => LiveKitModule),
    forwardRef(() => CoursesModule),
    FeatureFlagModule,
  ],
  controllers: [PublicMeetingsController, MeetingsGeneralController, WaitingRoomController],
  providers: [
    MeetingsService,
    MeetingsGateway,
    EnhancedMeetingsGateway,
    WaitingRoomService,
    MeetingSchedulerService,
    ScheduleAutomationService
  ],
  exports: [MeetingsService, WaitingRoomService, LiveKitModule, ScheduleAutomationService],
})
export class MeetingsModule { }

