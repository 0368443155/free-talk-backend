import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnhancedTeachersController } from './enhanced-teachers.controller';
import { TeachersController } from './teachers.controller';
import { EnhancedTeachersService } from './enhanced-teachers.service';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { TeacherReview } from './entities/teacher-review.entity';
import { TeacherAvailability } from './entities/teacher-availability.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { AffiliateModule } from '../affiliate/affiliate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherProfile,
      TeacherReview,
      TeacherAvailability,
      User,
      Meeting
    ]),
    forwardRef(() => AffiliateModule),
  ],
  controllers: [EnhancedTeachersController, TeachersController],
  providers: [EnhancedTeachersService],
  exports: [EnhancedTeachersService]
})
export class EnhancedTeachersModule { }