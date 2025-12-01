import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from './entities/withdrawal.entity';
import { User } from '../../users/user.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private readonly MIN_WITHDRAWAL_AMOUNT = 10; // $10 minimum

  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    teacherId: string,
    amount: number,
    bankAccountInfo: {
      bank_name: string;
      account_number: string;
      account_name: string;
      branch?: string;
      swift_code?: string;
    },
    notes?: string,
  ) {
    // Validate minimum amount
    if (amount < this.MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(
        `Minimum withdrawal amount is $${this.MIN_WITHDRAWAL_AMOUNT}`,
      );
    }

    // Get teacher
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validate balance
    if (teacher.credit_balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create withdrawal request
    const withdrawal = this.withdrawalRepository.create({
      teacher_id: teacherId,
      amount,
      status: WithdrawalStatus.PENDING,
      bank_account_info: bankAccountInfo,
      notes,
      requested_at: new Date(),
    });

    await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Withdrawal request created: ${withdrawal.id} for teacher ${teacherId}`);

    return withdrawal;
  }

  /**
   * Get teacher's withdrawals
   */
  async getMyWithdrawals(teacherId: string) {
    return this.withdrawalRepository.find({
      where: { teacher_id: teacherId },
      order: { requested_at: 'DESC' },
    });
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(id: string, teacherId?: string) {
    const where: any = { id };
    if (teacherId) {
      where.teacher_id = teacherId;
    }

    const withdrawal = await this.withdrawalRepository.findOne({
      where,
      relations: ['teacher'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  /**
   * Get all withdrawals (admin)
   */
  async getAllWithdrawals(status?: WithdrawalStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.withdrawalRepository.find({
      where,
      relations: ['teacher'],
      order: { requested_at: 'DESC' },
    });
  }

  /**
   * Approve withdrawal (admin)
   */
  async approveWithdrawal(withdrawalId: string, adminNotes?: string) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['teacher'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not pending');
    }

    // Update withdrawal status
    withdrawal.status = WithdrawalStatus.PROCESSING;
    withdrawal.processed_at = new Date();
    if (adminNotes) {
      withdrawal.admin_notes = adminNotes;
    }

    // Deduct balance
    const teacher = await this.userRepository.findOne({
      where: { id: withdrawal.teacher_id },
    });

    if (!teacher || teacher.credit_balance < withdrawal.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.userRepository.decrement(
      { id: withdrawal.teacher_id },
      'credit_balance',
      withdrawal.amount,
    );

    // Create transaction
    const balanceBefore = teacher.credit_balance;
    await this.transactionRepository.save({
      user_id: withdrawal.teacher_id,
      type: TransactionType.WITHDRAWAL,
      amount: -withdrawal.amount,
      balance_before: balanceBefore,
      balance_after: balanceBefore - withdrawal.amount,
      status: TransactionStatus.COMPLETED,
      reference_type: 'withdrawal',
      reference_id: withdrawal.id,
      description: `Withdrawal request approved`,
      metadata: {
        withdrawal_id: withdrawal.id,
        bank_account: withdrawal.bank_account_info,
      },
      completed_at: new Date(),
    });

    await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} approved`);

    return withdrawal;
  }

  /**
   * Complete withdrawal (admin) - after actual bank transfer
   */
  async completeWithdrawal(withdrawalId: string, adminNotes?: string) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PROCESSING) {
      throw new BadRequestException('Withdrawal is not processing');
    }

    withdrawal.status = WithdrawalStatus.COMPLETED;
    withdrawal.completed_at = new Date();
    if (adminNotes) {
      withdrawal.admin_notes = adminNotes;
    }

    await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} completed`);

    return withdrawal;
  }

  /**
   * Reject withdrawal (admin)
   */
  async rejectWithdrawal(withdrawalId: string, adminNotes: string) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['teacher'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not pending');
    }

    withdrawal.status = WithdrawalStatus.REJECTED;
    withdrawal.admin_notes = adminNotes;

    await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} rejected`);

    return withdrawal;
  }
}

