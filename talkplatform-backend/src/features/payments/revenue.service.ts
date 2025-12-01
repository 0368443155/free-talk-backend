import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { Withdrawal, WithdrawalStatus } from './entities/withdrawal.entity';
import { PaymentHold, HoldStatus } from '../courses/entities/payment-hold.entity';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(PaymentHold)
    private holdRepository: Repository<PaymentHold>,
  ) {}

  /**
   * Get teacher revenue summary
   */
  async getTeacherRevenue(teacherId: string) {
    // Get all payment releases
    const paymentReleases = await this.transactionRepository.find({
      where: {
        user_id: teacherId,
        type: TransactionType.PAYMENT_RELEASE,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Get all commissions (negative amounts)
    const commissions = await this.transactionRepository.find({
      where: {
        user_id: teacherId,
        type: TransactionType.COMMISSION,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Calculate totals
    const totalEarnings = paymentReleases.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCommissions = Math.abs(commissions.reduce((sum, t) => sum + Number(t.amount), 0));
    const netEarnings = totalEarnings - totalCommissions;

    // Get pending payments (held but not released)
    const pendingHolds = await this.holdRepository.find({
      where: {
        teacher_id: teacherId,
        status: HoldStatus.HELD,
      },
    });
    const pendingPayments = pendingHolds.reduce((sum, h) => sum + Number(h.amount), 0);

    // Get withdrawals
    const withdrawals = await this.withdrawalRepository.find({
      where: { teacher_id: teacherId },
    });

    const totalWithdrawn = withdrawals
      .filter(w => w.status === WithdrawalStatus.COMPLETED)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendingWithdrawals = withdrawals
      .filter(w => w.status === WithdrawalStatus.PENDING || w.status === WithdrawalStatus.PROCESSING)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    // Available balance = net earnings - total withdrawn - pending withdrawals
    const availableBalance = netEarnings - totalWithdrawn - pendingWithdrawals;

    return {
      total_earnings: totalEarnings,
      total_commissions: totalCommissions,
      net_earnings: netEarnings,
      pending_payments: pendingPayments,
      total_withdrawn: totalWithdrawn,
      pending_withdrawals: pendingWithdrawals,
      available_balance: Math.max(0, availableBalance), // Don't show negative
    };
  }

  /**
   * Get teacher transaction history
   */
  async getTransactionHistory(teacherId: string, limit = 50, offset = 0) {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { user_id: teacherId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get teacher withdrawal history
   */
  async getWithdrawalHistory(teacherId: string) {
    return this.withdrawalRepository.find({
      where: { teacher_id: teacherId },
      order: { requested_at: 'DESC' },
    });
  }
}

