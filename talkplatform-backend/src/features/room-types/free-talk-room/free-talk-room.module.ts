import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreeTalkRoomService } from './free-talk-room.service';
import { FreeTalkRoomController } from './free-talk-room.controller';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { RoomModule } from '../../../core/room/room.module';
import { AccessControlModule } from '../../../core/access-control/access-control.module';
import { EventBusModule } from '../../../infrastructure/event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, User]),
    RoomModule,
    AccessControlModule,
    EventBusModule,
  ],
  controllers: [FreeTalkRoomController],
  providers: [FreeTalkRoomService],
  exports: [FreeTalkRoomService],
})
export class FreeTalkRoomModule {}

