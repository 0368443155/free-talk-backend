import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { YouTubeSyncService } from './services/youtube-sync.service';
import { YouTubeApiService } from './services/youtube-api.service';
import { YouTubeSyncGateway } from './gateways/youtube-sync.gateway';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
    HttpModule,
    RoomModule,
  ],
  providers: [
    YouTubeSyncService,
    YouTubeApiService,
    YouTubeSyncGateway,
  ],
  exports: [
    YouTubeSyncService,
    YouTubeApiService,
    YouTubeSyncGateway,
  ],
})
export class YouTubeSyncModule {}

