import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { WithdrawalService } from '../features/payments/withdrawal.service';
import { User } from '../users/user.entity';
import { TeacherProfile } from '../features/teachers/entities/teacher-profile.entity';
import { TeacherVerification } from '../features/teachers/entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from '../features/teachers/entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from '../features/teachers/entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from '../features/teachers/entities/teacher-verification-reference.entity';
import { Withdrawal } from '../features/payments/entities/withdrawal.entity';
import { Transaction } from '../features/payments/entities/transaction.entity';
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
      Withdrawal,
      Transaction,
    ]),
    RedisModule,
  ],
  controllers: [AdminController, AdminWithdrawalController],
  providers: [AdminService, WithdrawalService],
  exports: [WithdrawalService],
})
export class AdminModule {}
