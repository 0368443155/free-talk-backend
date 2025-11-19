import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { MeetingsController } from './meetings.controller'; // REMOVED: Duplicate with ClassroomsController
import { PublicMeetingsController } from './public-meetings.controller';
import { MeetingsGeneralController } from './meetings-general.controller';
import { WaitingRoomController } from './controllers/waiting-room.controller';
import { MeetingsService } from './meetings.service';
import { MeetingsGateway } from './meetings.gateway';
import { EnhancedMeetingsGateway } from './enhanced-meetings.gateway';
import { WaitingRoomService } from './services/waiting-room.service';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingChatMessage } from './entities/meeting-chat-message.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { User } from '../../users/user.entity';
import { LiveKitModule } from '../../livekit/livekit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingParticipant,
      MeetingChatMessage,
      BlockedParticipant,
      User,
    ]),
    forwardRef(() => LiveKitModule),
  ],
  controllers: [PublicMeetingsController, MeetingsGeneralController, WaitingRoomController],
  providers: [MeetingsService, MeetingsGateway, EnhancedMeetingsGateway, WaitingRoomService],
  exports: [MeetingsService, WaitingRoomService, LiveKitModule],
})
export class MeetingsModule {}

