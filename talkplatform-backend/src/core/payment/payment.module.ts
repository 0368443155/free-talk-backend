import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrchestratorService } from './services/payment-orchestrator.service';
import { CreditManagerService } from './services/credit-manager.service';
import { TransactionManagerService } from './services/transaction-manager.service';
import { RefundManagerService } from './services/refund-manager.service';
import { PaymentHoldService } from './services/payment-hold.service';
import { HasCreditsGuard } from './guards/has-credits.guard';
import { PaymentVerifiedGuard } from './guards/payment-verified.guard';
import { User } from '../../users/user.entity';
import { CreditTransaction } from '../../features/credits/entities/credit-transaction.entity';
import { PaymentHold } from '../../features/courses/entities/payment-hold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      CreditTransaction,
      PaymentHold,
    ]),
  ],
  providers: [
    PaymentOrchestratorService,
    CreditManagerService,
    TransactionManagerService,
    RefundManagerService,
    PaymentHoldService,
    HasCreditsGuard,
    PaymentVerifiedGuard,
  ],
  exports: [
    PaymentOrchestratorService,
    CreditManagerService,
    TransactionManagerService,
    RefundManagerService,
    PaymentHoldService,
    HasCreditsGuard,
    PaymentVerifiedGuard,
  ],
})
export class PaymentModule {}

