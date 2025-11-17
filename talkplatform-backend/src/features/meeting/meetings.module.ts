import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { MeetingsController } from './meetings.controller'; // REMOVED: Duplicate with ClassroomsController
import { PublicMeetingsController } from './public-meetings.controller';
import { MeetingsGeneralController } from './meetings-general.controller';
import { MeetingsService } from './meetings.service';
import { MeetingsGateway } from './meetings.gateway';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingChatMessage } from './entities/meeting-chat-message.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingParticipant,
      MeetingChatMessage,
      BlockedParticipant,
      User,
    ]),
  ],
  controllers: [PublicMeetingsController, MeetingsGeneralController],
  providers: [MeetingsService, MeetingsGateway],
  exports: [MeetingsService],
})
export class MeetingsModule {}

