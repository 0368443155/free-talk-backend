import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewRoomService } from './interview-room.service';
import { InterviewRoomController } from './interview-room.controller';
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
  controllers: [InterviewRoomController],
  providers: [InterviewRoomService],
  exports: [InterviewRoomService],
})
export class InterviewRoomModule {}

