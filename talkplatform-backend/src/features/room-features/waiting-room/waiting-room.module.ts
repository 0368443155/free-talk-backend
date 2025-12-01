import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingRoomService } from './services/waiting-room.service';
import { WaitingRoomGateway } from './gateways/waiting-room.gateway';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
    RoomModule,
  ],
  providers: [
    WaitingRoomService,
    WaitingRoomGateway,
  ],
  exports: [
    WaitingRoomService,
    WaitingRoomGateway,
  ],
})
export class WaitingRoomModule {}

