import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherVerificationController } from './teacher-verification.controller';
import { TeacherVerificationService } from './teacher-verification.service';
import { TeacherVerification } from './entities/teacher-verification.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherVerification,
      TeacherProfile,
      User,
    ]),
  ],
  controllers: [TeacherVerificationController],
  providers: [TeacherVerificationService],
  exports: [TeacherVerificationService],
})
export class TeacherVerificationModule {}

