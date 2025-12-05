import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentReleaseService } from './payment-release.service';
import { WithdrawalService } from './withdrawal.service';
import { RevenueService } from './revenue.service';
import { WithdrawalController } from './withdrawal.controller';
import { RevenueController } from './revenue.controller';
import { Transaction } from './entities/transaction.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { CourseSession } from '../courses/entities/course-session.entity';
import { SessionPurchase } from '../courses/entities/session-purchase.entity';
import { PaymentHold } from '../courses/entities/payment-hold.entity';
import { AttendanceRecord } from '../courses/entities/attendance-record.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Withdrawal,
      CourseSession,
      SessionPurchase,
      PaymentHold,
      AttendanceRecord,
      User,
    ]),
  ],
  controllers: [WithdrawalController, RevenueController],
  providers: [PaymentReleaseService, WithdrawalService, RevenueService],
  exports: [PaymentReleaseService, WithdrawalService, RevenueService],
})
export class PaymentsModule { }

