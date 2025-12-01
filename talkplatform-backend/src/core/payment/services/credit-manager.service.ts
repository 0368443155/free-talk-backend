import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/user.entity';
import { CreditTransaction, TransactionType, TransactionStatus } from '../../../features/credits/entities/credit-transaction.entity';

@Injectable()
export class CreditManagerService {
  private readonly logger = new Logger(CreditManagerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
  ) {}

  /**
   * Get user credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.credit_balance || 0;
  }

  /**
   * Deduct credits from user
   */
  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<CreditTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.credit_balance < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    const balanceBefore = user.credit_balance;
    const balanceAfter = balanceBefore - amount;

    // Update user balance
    await this.userRepository.update(userId, {
      credit_balance: balanceAfter,
    });

    // Create transaction record
    const transaction = this.transactionRepository.create({
      user_id: userId,
      transaction_type: TransactionType.DEDUCTION,
      status: TransactionStatus.COMPLETED,
      credit_amount: amount,
      description,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_metadata: metadata,
    });

    return this.transactionRepository.save(transaction);
  }

  /**
   * Add credits to user
   */
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    transactionType: TransactionType = TransactionType.PURCHASE,
    metadata?: Record<string, any>,
  ): Promise<CreditTransaction> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balanceBefore = user.credit_balance || 0;
    const balanceAfter = balanceBefore + amount;

    // Update user balance
    await this.userRepository.update(userId, {
      credit_balance: balanceAfter,
    });

    // Create transaction record
    const transaction = this.transactionRepository.create({
      user_id: userId,
      transaction_type: transactionType,
      status: TransactionStatus.COMPLETED,
      credit_amount: amount,
      description,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_metadata: metadata,
    });

    return this.transactionRepository.save(transaction);
  }

  /**
   * Check if user has sufficient credits
   */
  async hasSufficientCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }
}

