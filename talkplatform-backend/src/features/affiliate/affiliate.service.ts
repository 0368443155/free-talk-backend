import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../../users/user.entity';
import { CreditTransaction, TransactionType, TransactionStatus } from '../credits/entities/credit-transaction.entity';
import { AffiliateStatsDto, ReferralDto, EarningsHistoryDto, ValidateAffiliateCodeDto } from './dto/affiliate-stats.dto';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
  ) {}

  /**
   * Get affiliate dashboard stats for a user
   */
  async getStats(userId: string): Promise<AffiliateStatsDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get total referrals count
    const totalReferrals = await this.userRepository.count({
      where: { referrer_id: userId },
    });

    // Get recent referrals (last 10)
    const recentReferrals = await this.userRepository.find({
      where: { referrer_id: userId },
      order: { created_at: 'DESC' },
      take: 10,
      select: ['id', 'username', 'email', 'avatar_url', 'created_at'],
    });

    // Calculate total earnings from affiliate transactions
    const totalEarningsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.credit_amount)', 'total')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.transaction_type = :type', { type: TransactionType.AFFILIATE_BONUS })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const totalEarnings = Number(totalEarningsResult?.total || 0);

    // Calculate this month earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarningsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.credit_amount)', 'total')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.transaction_type = :type', { type: TransactionType.AFFILIATE_BONUS })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.created_at >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    const thisMonthEarnings = Number(thisMonthEarningsResult?.total || 0);

    // Generate referral link
    const referralLink = this.generateReferralLink(user.affiliate_code);

    return {
      total_referrals: totalReferrals,
      total_earnings: totalEarnings,
      this_month_earnings: thisMonthEarnings,
      recent_referrals: recentReferrals.map((ref) => ({
        id: ref.id,
        name: ref.username,
        avatar: ref.avatar_url || '/default-avatar.png',
        joined_at: ref.created_at,
      })),
      referral_link: referralLink,
    };
  }

  /**
   * Get detailed referrals list
   */
  async getReferrals(userId: string, page: number = 1, limit: number = 20): Promise<{ referrals: ReferralDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [referrals, total] = await this.userRepository.findAndCount({
      where: { referrer_id: userId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      select: ['id', 'username', 'email', 'avatar_url', 'created_at'],
    });

    // Calculate total spent for each referral
    const referralsWithSpending = await Promise.all(
      referrals.map(async (ref) => {
        const totalSpentResult = await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.credit_amount)', 'total')
          .where('transaction.user_id = :userId', { userId: ref.id })
          .andWhere('transaction.transaction_type IN (:...types)', {
            types: [TransactionType.DEDUCTION, TransactionType.PURCHASE],
          })
          .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
          .getRawOne();

        const totalSpent = Number(totalSpentResult?.total || 0);

        // Check if active (has transactions in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransaction = await this.transactionRepository.findOne({
          where: {
            user_id: ref.id,
            status: TransactionStatus.COMPLETED,
            created_at: MoreThan(thirtyDaysAgo),
          },
        });

        return {
          id: ref.id,
          username: ref.username,
          email: ref.email,
          avatar_url: ref.avatar_url,
          joined_at: ref.created_at,
          total_spent: totalSpent,
          is_active: !!recentTransaction,
        };
      }),
    );

    return {
      referrals: referralsWithSpending,
      total,
    };
  }

  /**
   * Get earnings history
   */
  async getEarningsHistory(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<EarningsHistoryDto[]> {
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const transactions = await this.transactionRepository.find({
      where: {
        user_id: userId,
        transaction_type: TransactionType.AFFILIATE_BONUS,
        status: TransactionStatus.COMPLETED,
        created_at: MoreThan(startDate),
      },
      order: { created_at: 'DESC' },
    });

    // Group by date
    const groupedByDate = transactions.reduce((acc, transaction) => {
      const dateKey = transaction.created_at.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          earnings: 0,
          referrals_count: 0,
          transactions: [],
        };
      }
      acc[dateKey].earnings += Number(transaction.credit_amount);
      acc[dateKey].transactions.push({
        id: transaction.id,
        amount: Number(transaction.credit_amount),
        description: transaction.description || 'Affiliate bonus',
        created_at: transaction.created_at,
      });
      return acc;
    }, {} as Record<string, EarningsHistoryDto>);

    return Object.values(groupedByDate).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Validate affiliate code
   */
  async validateAffiliateCode(code: string): Promise<ValidateAffiliateCodeDto> {
    if (!code) {
      return {
        valid: false,
        message: 'Affiliate code is required',
      };
    }

    const referrer = await this.userRepository.findOne({
      where: { affiliate_code: code },
      select: ['id', 'username', 'avatar_url'],
    });

    if (!referrer) {
      return {
        valid: false,
        message: 'Invalid affiliate code',
      };
    }

    return {
      valid: true,
      referrer: {
        id: referrer.id,
        username: referrer.username,
        avatar_url: referrer.avatar_url,
      },
    };
  }

  /**
   * Generate referral link
   */
  private generateReferralLink(affiliateCode: string | null): string {
    if (!affiliateCode) {
      return '';
    }

    // Get base URL from environment or use default
    const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/register?ref=${affiliateCode}`;
  }
}

