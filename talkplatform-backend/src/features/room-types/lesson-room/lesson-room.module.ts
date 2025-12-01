import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonRoomService } from './lesson-room.service';
import { LessonRoomController } from './lesson-room.controller';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { RoomModule } from '../../../core/room/room.module';
import { AccessControlModule } from '../../../core/access-control/access-control.module';
import { EventBusModule } from '../../../infrastructure/event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, User, Lesson]),
    RoomModule,
    AccessControlModule,
    EventBusModule,
  ],
  controllers: [LessonRoomController],
  providers: [LessonRoomService],
  exports: [LessonRoomService],
})
export class LessonRoomModule {}

