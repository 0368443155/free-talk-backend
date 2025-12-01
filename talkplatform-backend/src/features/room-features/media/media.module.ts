import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioControlService } from './services/audio-control.service';
import { VideoControlService } from './services/video-control.service';
import { ScreenShareService } from './services/screen-share.service';
import { MediaSettingsService } from './services/media-settings.service';
import { MediaGateway } from './gateways/media.gateway';
import { MeetingParticipant } from '../../meeting/entities/meeting-participant.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingParticipant, Meeting]),
    RoomModule,
  ],
  providers: [
    AudioControlService,
    VideoControlService,
    ScreenShareService,
    MediaSettingsService,
    MediaGateway,
  ],
  exports: [
    AudioControlService,
    VideoControlService,
    ScreenShareService,
    MediaSettingsService,
    MediaGateway,
  ],
})
export class MediaModule {}

