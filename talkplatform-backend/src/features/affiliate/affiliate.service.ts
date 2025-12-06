import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User, UserRole } from '../../users/user.entity';
import { CreditTransaction, TransactionType, TransactionStatus } from '../credits/entities/credit-transaction.entity';
import { TeacherProfile, TeacherStatus } from '../teachers/entities/teacher-profile.entity';
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
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['teacherProfile'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Chỉ giáo viên đã verified mới có affiliate_code
      if (user.role !== UserRole.TEACHER) {
        throw new ForbiddenException('Only verified teachers can access affiliate dashboard');
      }

      if (!user.teacherProfile || user.teacherProfile.status !== TeacherStatus.APPROVED) {
        throw new ForbiddenException('Only verified teachers can access affiliate dashboard');
      }

      // Nếu chưa có affiliate_code (edge case), tạo ngay
      if (!user.affiliate_code) {
        const affiliateCode = await this.generateUniqueAffiliateCode(user.username || user.email);
        user.affiliate_code = affiliateCode;
        await this.userRepository.update(userId, { affiliate_code: affiliateCode });
        this.logger.log(`Auto-generated affiliate_code for verified teacher ${userId}: ${affiliateCode}`);
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

    // Calculate total earnings from affiliate transactions (using amount column)
    const totalEarningsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.transaction_type = :type', { type: TransactionType.AFFILIATE_BONUS })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const totalEarnings = Math.abs(Number(totalEarningsResult?.total || 0)); // Use absolute value

    // Calculate this month earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarningsResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.transaction_type = :type', { type: TransactionType.AFFILIATE_BONUS })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.created_at >= :startDate', { startDate: startOfMonth })
      .getRawOne();

    const thisMonthEarnings = Math.abs(Number(thisMonthEarningsResult?.total || 0)); // Use absolute value

    // Return chỉ affiliate_code, KHÔNG return referral_link
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
      referral_code: user.affiliate_code || '', // Chỉ trả về code, không phải link
    };
    } catch (error) {
      this.logger.error(`Error getting affiliate stats for user ${userId}:`, error);
      throw error;
    }
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
          .select('SUM(ABS(transaction.amount))', 'total') // Use amount column
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

        // Use query builder to only select existing columns
        const recentTransaction = await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('transaction.id', 'id') // Only select id to check existence
          .where('transaction.user_id = :userId', { userId: ref.id })
          .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
          .andWhere('transaction.created_at > :date', { date: thirtyDaysAgo })
          .limit(1)
          .getRawOne();

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

    // Use raw query to only select columns that exist in old schema (amount instead of credit_amount)
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        'transaction.id AS id',
        'transaction.amount AS amount', // Use amount column from old schema
        'transaction.description AS description',
        'transaction.created_at AS created_at',
      ])
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.transaction_type = :type', { type: TransactionType.AFFILIATE_BONUS })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.created_at > :startDate', { startDate })
      .orderBy('transaction.created_at', 'DESC')
      .getRawMany();

    // Group by date
    const groupedByDate = transactions.reduce((acc: Record<string, EarningsHistoryDto>, row: any) => {
      const dateKey = new Date(row.created_at).toISOString().split('T')[0];
      const amount = Number(row.amount || 0);
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          earnings: 0,
          referrals_count: 0,
          transactions: [],
        };
      }
      acc[dateKey].earnings += Math.abs(amount); // Use absolute value for earnings (amount can be negative)
      acc[dateKey].transactions.push({
        id: row.id,
        amount: Math.abs(amount),
        description: row.description || 'Affiliate bonus',
        created_at: new Date(row.created_at),
      });
      return acc;
    }, {} as Record<string, EarningsHistoryDto>);

    return Object.values(groupedByDate).sort((a: EarningsHistoryDto, b: EarningsHistoryDto) => b.date.localeCompare(a.date)) as EarningsHistoryDto[];
  }

  /**
   * Validate affiliate code (public endpoint - for registration)
   */
  async validateReferralCodePublic(code: string): Promise<{
    valid: boolean;
    message?: string;
    referrer_name?: string;
  }> {
    if (!code) {
      return {
        valid: false,
        message: 'Referral code is required',
      };
    }

    const referrer = await this.userRepository.findOne({
      where: { affiliate_code: code },
      relations: ['teacherProfile'],
    });

    if (!referrer) {
      return {
        valid: false,
        message: 'Invalid referral code',
      };
    }

    // Validate là giáo viên và đã được verify
    if (referrer.role !== UserRole.TEACHER) {
      return {
        valid: false,
        message: 'Referral code is not from a verified teacher',
      };
    }

    if (!referrer.teacherProfile || referrer.teacherProfile.status !== TeacherStatus.APPROVED) {
      return {
        valid: false,
        message: 'Referral code is not from a verified teacher',
      };
    }

    return {
      valid: true,
      referrer_name: referrer.username,
    };
  }

  /**
   * Validate affiliate code (internal - existing method for backward compatibility)
   */
  async validateAffiliateCode(code: string): Promise<ValidateAffiliateCodeDto> {
    const result = await this.validateReferralCodePublic(code);
    
    if (!result.valid) {
      return {
        valid: false,
        message: result.message,
      };
    }

    const referrer = await this.userRepository.findOne({
      where: { affiliate_code: code },
      select: ['id', 'username', 'avatar_url'],
    });

    return {
      valid: true,
      referrer: {
        id: referrer!.id,
        username: referrer!.username,
        avatar_url: referrer!.avatar_url,
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
    const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    return `${baseUrl}/register?ref=${affiliateCode}`;
  }

  /**
   * Generate unique affiliate code (same logic as UsersService)
   */
  private async generateUniqueAffiliateCode(identifier: string): Promise<string> {
    const prefix = identifier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    let code: string = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const suffix = Math.floor(100 + Math.random() * 900); // 3 digit random (100-999)
      code = `${prefix}${suffix}`;
      
      const existing = await this.userRepository.findOne({
        where: { affiliate_code: code }
      });
      
      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique || !code) {
      // Fallback: use timestamp if can't generate unique code
      const timestamp = Date.now().toString().slice(-6);
      code = `${prefix}${timestamp}`;
    }

    return code;
  }
}

