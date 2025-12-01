import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recording } from './entities/recording.entity';
import { RecordingService } from './services/recording.service';
import { RecordingGateway } from './recording.gateway';
import { RoomModule } from '../../../core/room/room.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recording]),
    RoomModule,
    ConfigModule,
  ],
  providers: [RecordingService, RecordingGateway],
  exports: [RecordingService],
})
export class RecordingModule {}

