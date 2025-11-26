import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { TeacherProfile } from '../features/teachers/entities/teacher-profile.entity';
import { TeacherVerification } from '../features/teachers/entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from '../features/teachers/entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from '../features/teachers/entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from '../features/teachers/entities/teacher-verification-reference.entity';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TeacherProfile,
      TeacherVerification,
      TeacherVerificationDegreeCertificate,
      TeacherVerificationTeachingCertificate,
      TeacherVerificationReference,
    ]),
    RedisModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
