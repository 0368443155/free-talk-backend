import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTransaction, TransactionStatus } from '../../../features/credits/entities/credit-transaction.entity';
import { ITransaction } from '../interfaces/transaction.interface';

@Injectable()
export class TransactionManagerService {
  private readonly logger = new Logger(TransactionManagerService.name);

  constructor(
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
  ) {}

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<CreditTransaction | null> {
    return this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user', 'meeting', 'teacher'],
    });
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<CreditTransaction[]> {
    return this.transactionRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['meeting', 'teacher'],
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.transactionRepository.update(transactionId, {
      status,
      payment_metadata: metadata,
      processed_at: new Date(),
    });
  }

  /**
   * Convert to ITransaction interface
   */
  toITransaction(transaction: CreditTransaction): ITransaction {
    return {
      id: transaction.id,
      userId: transaction.user_id,
      type: transaction.transaction_type as any,
      status: transaction.status as any,
      amount: transaction.credit_amount,
      currency: transaction.currency || 'USD',
      description: transaction.description,
      metadata: transaction.payment_metadata,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    };
  }
}

