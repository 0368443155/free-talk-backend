import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KickUserService } from './services/kick-user.service';
import { BlockUserService } from './services/block-user.service';
import { RoomLockService } from './services/room-lock.service';
import { MuteControlService } from './services/mute-control.service';
import { ModerationLogService } from './services/moderation-log.service';
import { ModerationGateway } from './gateways/moderation.gateway';
import { IsModeratorGuard } from './guards/is-moderator.guard';
import { MeetingParticipant } from '../../meeting/entities/meeting-participant.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { BlockedParticipant } from '../../meeting/entities/blocked-participant.entity';
import { RoomModule } from '../../../core/room/room.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingParticipant, Meeting, BlockedParticipant]),
    RoomModule,
    MediaModule,
  ],
  providers: [
    KickUserService,
    BlockUserService,
    RoomLockService,
    MuteControlService,
    ModerationLogService,
    ModerationGateway,
    IsModeratorGuard,
  ],
  exports: [
    KickUserService,
    BlockUserService,
    RoomLockService,
    MuteControlService,
    ModerationLogService,
    ModerationGateway,
    IsModeratorGuard,
  ],
})
export class ModerationModule {}

