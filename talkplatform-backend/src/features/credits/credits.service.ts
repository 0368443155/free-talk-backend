import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreditTransaction, TransactionType, TransactionStatus, PaymentProvider } from './entities/credit-transaction.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { PurchaseCreditsDto, DonateCreditsDto } from './dto/credits.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
    @InjectRepository(CreditPackage)
    private packageRepository: Repository<CreditPackage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>
  ) {}

  // Get user credit balance and recent activity
  async getCreditBalance(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get recent transactions
    const recentTransactions = await this.transactionRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 10,
      relations: ['meeting', 'teacher']
    });

    // Get spending summary for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlySpending = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(CASE WHEN transaction_type = :deduction THEN credit_amount ELSE 0 END)', 'spent')
      .addSelect('SUM(CASE WHEN transaction_type = :purchase THEN credit_amount ELSE 0 END)', 'purchased')
      .addSelect('SUM(CASE WHEN transaction_type = :earning THEN credit_amount ELSE 0 END)', 'earned')
      .where('user_id = :userId', { userId })
      .andWhere('created_at >= :monthStart AND created_at <= :monthEnd', { monthStart, monthEnd })
      .andWhere('status = :status', { status: TransactionStatus.COMPLETED })
      .setParameters({
        deduction: TransactionType.DEDUCTION,
        purchase: TransactionType.PURCHASE,
        earning: TransactionType.EARNING
      })
      .getRawOne();

    return {
      current_balance: user.credit_balance,
      monthly_summary: {
        spent: parseFloat(monthlySpending.spent) || 0,
        purchased: parseFloat(monthlySpending.purchased) || 0,
        earned: parseFloat(monthlySpending.earned) || 0
      },
      recent_transactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.credit_amount,
        description: t.description,
        status: t.status,
        created_at: t.created_at,
        meeting_title: t.meeting?.title,
        teacher_name: t.teacher?.username
      }))
    };
  }

  // Get available credit packages
  async getCreditPackages() {
    const packages = await this.packageRepository.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', credit_amount: 'ASC' }
    });

    return packages.map(pkg => ({
      ...pkg,
      total_credits: pkg.credit_amount + pkg.bonus_credits,
      value_per_credit: pkg.usd_price / pkg.credit_amount,
      savings: pkg.discount_percentage ? 
        (pkg.credit_amount * (pkg.usd_price / pkg.credit_amount) * (pkg.discount_percentage / 100)) : 0
    }));
  }

  // Initiate credit purchase
  async initiateCreditPurchase(dto: PurchaseCreditsDto, user: User) {
    const package_ = await this.packageRepository.findOne({ 
      where: { id: dto.package_id, is_active: true } 
    });

    if (!package_) {
      throw new NotFoundException('Credit package not found');
    }

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      user,
      user_id: user.id,
      transaction_type: TransactionType.PURCHASE,
      status: TransactionStatus.PENDING,
      credit_amount: package_.credit_amount + package_.bonus_credits,
      usd_amount: package_.usd_price,
      currency: 'USD',
      description: `Purchase of ${package_.name}`,
      payment_provider: dto.payment_provider,
      payment_metadata: dto.payment_metadata,
      balance_before: user.credit_balance
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Generate payment URL based on provider
    let paymentUrl: string;
    let externalTransactionId: string;

    switch (dto.payment_provider) {
      case PaymentProvider.STRIPE:
        const stripeResult = await this.createStripePaymentIntent(package_, savedTransaction, dto);
        paymentUrl = stripeResult.payment_url;
        externalTransactionId = stripeResult.payment_intent_id;
        break;

      case PaymentProvider.PAYPAL:
        const paypalResult = await this.createPayPalOrder(package_, savedTransaction, dto);
        paymentUrl = paypalResult.payment_url;
        externalTransactionId = paypalResult.order_id;
        break;

      case PaymentProvider.VNPAY:
        const vnpayResult = await this.createVNPayPayment(package_, savedTransaction, dto);
        paymentUrl = vnpayResult.payment_url;
        externalTransactionId = vnpayResult.transaction_id;
        break;

      default:
        throw new BadRequestException('Unsupported payment provider');
    }

    // Update transaction with external ID
    savedTransaction.external_transaction_id = externalTransactionId;
    await this.transactionRepository.save(savedTransaction);

    this.logger.log(`Credit purchase initiated: ${savedTransaction.id} for user ${user.id}`);

    return {
      transaction_id: savedTransaction.id,
      payment_url: paymentUrl,
      external_transaction_id: externalTransactionId,
      amount_usd: package_.usd_price,
      credits_amount: package_.credit_amount + package_.bonus_credits,
      expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }

  // Confirm credit purchase after payment
  async confirmCreditPurchase(transactionId: string, user: User) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, user_id: user.id },
      relations: ['user']
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction already processed');
    }

    // Verify payment with provider
    const paymentVerified = await this.verifyPayment(transaction);

    if (!paymentVerified) {
      transaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
      throw new BadRequestException('Payment verification failed');
    }

    // Add credits to user balance
    const user_ = transaction.user;
    user_.credit_balance += transaction.credit_amount;
    await this.userRepository.save(user_);

    // Update transaction
    transaction.status = TransactionStatus.COMPLETED;
    transaction.balance_after = user_.credit_balance;
    transaction.processed_at = new Date();
    await this.transactionRepository.save(transaction);

    this.logger.log(`Credit purchase confirmed: ${transactionId}, added ${transaction.credit_amount} credits to user ${user.id}`);

    return {
      success: true,
      credits_added: transaction.credit_amount,
      new_balance: user_.credit_balance,
      transaction: transaction
    };
  }

  // Donate credits to teacher
  async donateCredits(fromUser: User, teacherId: string, dto: DonateCreditsDto) {
    const teacher = await this.userRepository.findOne({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (fromUser.credit_balance < dto.amount) {
      throw new BadRequestException('Insufficient credits');
    }

    // Deduct from sender
    const deductionTransaction = this.transactionRepository.create({
      user: fromUser,
      user_id: fromUser.id,
      transaction_type: TransactionType.DONATION,
      status: TransactionStatus.COMPLETED,
      credit_amount: -dto.amount,
      description: `Donation to ${dto.anonymous ? 'Anonymous Teacher' : teacher.username}${dto.message ? ': ' + dto.message : ''}`,
      teacher,
      teacher_id: teacherId,
      balance_before: fromUser.credit_balance,
      balance_after: fromUser.credit_balance - dto.amount,
      payment_provider: PaymentProvider.INTERNAL,
      processed_at: new Date()
    });

    // Add to teacher
    const earningTransaction = this.transactionRepository.create({
      user: teacher,
      user_id: teacherId,
      transaction_type: TransactionType.EARNING,
      status: TransactionStatus.COMPLETED,
      credit_amount: dto.amount,
      description: `Donation from ${dto.anonymous ? 'Anonymous User' : fromUser.username}${dto.message ? ': ' + dto.message : ''}`,
      balance_before: teacher.credit_balance,
      balance_after: teacher.credit_balance + dto.amount,
      payment_provider: PaymentProvider.INTERNAL,
      processed_at: new Date()
    });

    // Update balances
    fromUser.credit_balance -= dto.amount;
    teacher.credit_balance += dto.amount;

    // Save everything
    await Promise.all([
      this.userRepository.save(fromUser),
      this.userRepository.save(teacher),
      this.transactionRepository.save(deductionTransaction),
      this.transactionRepository.save(earningTransaction)
    ]);

    this.logger.log(`Donation: ${dto.amount} credits from ${fromUser.id} to ${teacherId}`);

    return {
      success: true,
      amount_donated: dto.amount,
      new_balance: fromUser.credit_balance,
      teacher_name: dto.anonymous ? null : teacher.username
    };
  }

  // Process meeting payment and revenue share
  async processClassPayment(meeting: Meeting, student: User) {
    if (meeting.price_credits === 0) {
      return { success: true, amount: 0 };
    }

    if (student.credit_balance < meeting.price_credits) {
      throw new BadRequestException('Insufficient credits');
    }

    // Determine revenue share based on student source
    const isAffiliateStudent = await this.isAffiliateStudent(student, meeting.host);
    const platformPercentage = isAffiliateStudent ? 30 : 70;
    const teacherPercentage = 100 - platformPercentage;

    const platformFee = (meeting.price_credits * platformPercentage) / 100;
    const teacherEarning = meeting.price_credits - platformFee;

    // Student payment transaction
    const studentTransaction = this.transactionRepository.create({
      user: student,
      user_id: student.id,
      transaction_type: TransactionType.DEDUCTION,
      status: TransactionStatus.COMPLETED,
      credit_amount: -meeting.price_credits,
      description: `Joined class: ${meeting.title}`,
      meeting,
      meeting_id: meeting.id,
      teacher: meeting.host,
      teacher_id: meeting.host.id,
      affiliate_code: meeting.affiliate_code,
      platform_fee_percentage: platformPercentage,
      platform_fee_amount: platformFee,
      teacher_amount: teacherEarning,
      balance_before: student.credit_balance,
      balance_after: student.credit_balance - meeting.price_credits,
      payment_provider: PaymentProvider.INTERNAL,
      processed_at: new Date()
    });

    // Teacher earning transaction
    const teacherTransaction = this.transactionRepository.create({
      user: meeting.host,
      user_id: meeting.host.id,
      transaction_type: TransactionType.EARNING,
      status: TransactionStatus.COMPLETED,
      credit_amount: teacherEarning,
      description: `Class earning: ${meeting.title}`,
      meeting,
      meeting_id: meeting.id,
      affiliate_code: meeting.affiliate_code,
      platform_fee_percentage: platformPercentage,
      platform_fee_amount: platformFee,
      balance_before: meeting.host.credit_balance,
      balance_after: meeting.host.credit_balance + teacherEarning,
      payment_provider: PaymentProvider.INTERNAL,
      processed_at: new Date()
    });

    // Update balances
    student.credit_balance -= meeting.price_credits;
    meeting.host.credit_balance += teacherEarning;

    // Save everything
    await Promise.all([
      this.userRepository.save(student),
      this.userRepository.save(meeting.host),
      this.transactionRepository.save(studentTransaction),
      this.transactionRepository.save(teacherTransaction)
    ]);

    this.logger.log(`Class payment processed: ${meeting.price_credits} credits for meeting ${meeting.id}, teacher gets ${teacherEarning}, platform gets ${platformFee}`);

    return {
      success: true,
      amount_paid: meeting.price_credits,
      teacher_earning: teacherEarning,
      platform_fee: platformFee,
      revenue_share: `${platformPercentage}% platform / ${teacherPercentage}% teacher`
    };
  }

  // Check if student is from teacher's affiliate program
  private async isAffiliateStudent(student: User, teacher: User): Promise<boolean> {
    return student.refferrer_id === teacher.id || 
           (student.affiliate_code && student.affiliate_code === teacher.affiliate_code) || false;
  }

  // Get transaction history
  async getTransactionHistory(userId: string, paginationDto: PaginationDto, filters: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.meeting', 'meeting')
      .leftJoinAndSelect('transaction.teacher', 'teacher')
      .where('transaction.user_id = :userId', { userId })
      .orderBy('transaction.created_at', 'DESC');

    if (filters.transaction_type) {
      queryBuilder.andWhere('transaction.transaction_type = :type', { type: filters.transaction_type });
    }

    if (filters.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: filters.status });
    }

    const [transactions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get teacher earnings
  async getTeacherEarnings(teacherId: string, paginationDto: PaginationDto, period?: string) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    // Calculate date range based on period
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
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    }

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.meeting', 'meeting')
      .where('transaction.user_id = :teacherId', { teacherId })
      .andWhere('transaction.transaction_type IN (:...types)', { 
        types: [TransactionType.EARNING, TransactionType.DONATION, TransactionType.AFFILIATE_BONUS] 
      })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('transaction.created_at >= :startDate AND transaction.created_at <= :endDate', { startDate, endDate })
      .orderBy('transaction.created_at', 'DESC');

    const [earnings, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Calculate summary
    const summary = await queryBuilder
      .select('SUM(transaction.credit_amount)', 'total_earned')
      .addSelect('COUNT(*)', 'transaction_count')
      .addSelect('AVG(transaction.credit_amount)', 'avg_earning')
      .getRawOne();

    return {
      summary: {
        total_earned: parseFloat(summary.total_earned) || 0,
        transaction_count: parseInt(summary.transaction_count) || 0,
        average_earning: parseFloat(summary.avg_earning) || 0,
        period: period || 'last_30_days'
      },
      earnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get affiliate stats
  async getAffiliateStats(userId: string) {
    // TODO: Implement affiliate statistics
    return {
      total_referrals: 0,
      active_referrals: 0,
      total_commissions: 0,
      this_month_commissions: 0
    };
  }

  // Payment provider implementations (mock)
  private async createStripePaymentIntent(package_: CreditPackage, transaction: CreditTransaction, dto: PurchaseCreditsDto) {
    // TODO: Implement Stripe integration
    return {
      payment_intent_id: `pi_mock_${transaction.id}`,
      payment_url: `https://checkout.stripe.com/pay/${transaction.id}`
    };
  }

  private async createPayPalOrder(package_: CreditPackage, transaction: CreditTransaction, dto: PurchaseCreditsDto) {
    // TODO: Implement PayPal integration
    return {
      order_id: `PAYPAL_ORDER_${transaction.id}`,
      payment_url: `https://www.paypal.com/checkoutnow?order_id=${transaction.id}`
    };
  }

  private async createVNPayPayment(package_: CreditPackage, transaction: CreditTransaction, dto: PurchaseCreditsDto) {
    // TODO: Implement VNPay integration
    return {
      transaction_id: `VNPAY_${transaction.id}`,
      payment_url: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?transaction_id=${transaction.id}`
    };
  }

  private async verifyPayment(transaction: CreditTransaction): Promise<boolean> {
    // TODO: Implement payment verification with each provider
    // For now, simulate successful payment
    return true;
  }

  async getRevenueShareBreakdown(meetingId: string, user: User) {
    const transactions = await this.transactionRepository.find({
      where: { meeting_id: meetingId },
      relations: ['user', 'meeting']
    });

    const breakdown = {
      meeting_id: meetingId,
      total_revenue: 0,
      platform_revenue: 0,
      teacher_revenue: 0,
      participant_count: 0,
      transactions: transactions
    };

    transactions.forEach(t => {
      if (t.transaction_type === TransactionType.DEDUCTION) {
        breakdown.total_revenue += Math.abs(t.credit_amount);
        breakdown.platform_revenue += t.platform_fee_amount || 0;
        breakdown.participant_count += 1;
      } else if (t.transaction_type === TransactionType.EARNING) {
        breakdown.teacher_revenue += t.credit_amount;
      }
    });

    return breakdown;
  }

  async requestWithdrawal(user: User, withdrawalDto: any) {
    // TODO: Implement withdrawal system
    return {
      success: true,
      message: 'Withdrawal request submitted for review'
    };
  }

  async adminAdjustCredits(userId: string, adjustmentDto: any, adminUser: User) {
    // TODO: Implement admin credit adjustment
    return {
      success: true,
      message: 'Credits adjusted successfully'
    };
  }

  async getAllTransactions(paginationDto: PaginationDto, filters: any) {
    // TODO: Implement admin transaction listing
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }

  async getPlatformRevenueSummary(startDate?: string, endDate?: string) {
    // TODO: Implement platform revenue summary
    return {
      total_revenue: 0,
      platform_fees: 0,
      teacher_payouts: 0
    };
  }
}