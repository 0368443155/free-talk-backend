import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherClassRoomService } from './teacher-class-room.service';
import { TeacherClassRoomController } from './teacher-class-room.controller';
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
  controllers: [TeacherClassRoomController],
  providers: [TeacherClassRoomService],
  exports: [TeacherClassRoomService],
})
export class TeacherClassRoomModule {}

