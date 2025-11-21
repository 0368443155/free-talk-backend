import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnhancedTeachersController } from './enhanced-teachers.controller';
import { EnhancedTeachersService } from './enhanced-teachers.service';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { TeacherReview } from './entities/teacher-review.entity';
import { TeacherAvailability } from './entities/teacher-availability.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherProfile,
      TeacherReview, 
      TeacherAvailability,
      User,
      Meeting
    ])
  ],
  controllers: [EnhancedTeachersController],
  providers: [EnhancedTeachersService],
  exports: [EnhancedTeachersService]
})
export class EnhancedTeachersModule {}