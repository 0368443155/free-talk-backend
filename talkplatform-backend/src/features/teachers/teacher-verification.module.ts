import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherVerificationController } from './teacher-verification.controller';
import { TeacherVerificationService } from './teacher-verification.service';
import { TeacherVerification } from './entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from './entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './entities/teacher-verification-reference.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { User } from '../../users/user.entity';
import { StorageModule } from '../../core/storage/storage.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherVerification,
      TeacherVerificationDegreeCertificate,
      TeacherVerificationTeachingCertificate,
      TeacherVerificationReference,
      TeacherProfile,
      User,
    ]),
    StorageModule,
    UsersModule, // Import UsersModule để sử dụng UsersService
  ],
  controllers: [TeacherVerificationController],
  providers: [TeacherVerificationService],
  exports: [TeacherVerificationService],
})
export class TeacherVerificationModule {}

