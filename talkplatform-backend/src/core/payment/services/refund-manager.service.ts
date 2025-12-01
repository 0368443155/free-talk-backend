import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTransaction, TransactionType, TransactionStatus } from '../../../features/credits/entities/credit-transaction.entity';
import { CreditManagerService } from './credit-manager.service';
import { TransactionManagerService } from './transaction-manager.service';

@Injectable()
export class RefundManagerService {
  private readonly logger = new Logger(RefundManagerService.name);

  constructor(
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
    private readonly creditManager: CreditManagerService,
    private readonly transactionManager: TransactionManagerService,
  ) {}

  /**
   * Process refund
   */
  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<CreditTransaction> {
    const originalTransaction = await this.transactionManager.getTransaction(transactionId);
    
    if (!originalTransaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (originalTransaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed transactions');
    }

    if (originalTransaction.transaction_type === TransactionType.DEDUCTION) {
      // Refund credits to user
      const refundAmount = amount || originalTransaction.credit_amount;
      
      await this.creditManager.addCredits(
        originalTransaction.user_id,
        refundAmount,
        `Refund for transaction ${transactionId}: ${reason || 'No reason provided'}`,
        TransactionType.REFUND,
        {
          originalTransactionId: transactionId,
          refundReason: reason,
        },
      );

      // Mark original transaction as refunded
      await this.transactionManager.updateTransactionStatus(
        transactionId,
        TransactionStatus.REFUNDED,
        { refundAmount, reason },
      );

      return originalTransaction;
    }

    throw new BadRequestException('Cannot refund this transaction type');
  }
}

