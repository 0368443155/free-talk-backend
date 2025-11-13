import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';
import { Classroom } from './entities/classroom.entity';
import { ClassroomMember } from './entities/classroom-member.entity';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom, ClassroomMember, Meeting, MeetingParticipant, User]),
  ],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}