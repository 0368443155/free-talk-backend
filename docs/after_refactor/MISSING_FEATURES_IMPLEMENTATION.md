# 🚀 MISSING FEATURES IMPLEMENTATION - Các Chức Năng Còn Thiếu

**Ngày tạo:** 2025-12-01  
**Mục đích:** Hoàn thiện các chức năng business còn thiếu  
**Ưu tiên:** High

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Feature 1: Payment Auto-Release](#feature-1-payment-auto-release)
3. [Feature 2: Commission System](#feature-2-commission-system)
4. [Feature 3: Teacher Payout](#feature-3-teacher-payout)
5. [Feature 4: Recording System](#feature-4-recording-system)
6. [Feature 5: AI Features](#feature-5-ai-features)
7. [Feature 6: Advanced Analytics](#feature-6-advanced-analytics)
8. [Feature 7: Premium Tier](#feature-7-premium-tier)

---

## 🎯 TỔNG QUAN

### Trạng Thái Hiện Tại

```
Business Features Progress: 60% ████████████░░░░░░░░

✅ Completed:
  - Course management
  - Enrollment system
  - Payment hold
  - Free talk rooms
  - Basic chat & media

⚠️ Partial:
  - Auto-release (60%)
  - Recording (40%)
  - Analytics (30%)

❌ Missing:
  - Commission system
  - Teacher payout
  - AI features
  - Premium tier
```

### Mục Tiêu

- ✅ Complete payment auto-release
- ✅ Implement commission calculation
- ✅ Build teacher payout system
- ✅ Add cloud recording
- ✅ Integrate AI features
- ✅ Launch premium tier

---

## 💰 FEATURE 1: Payment Auto-Release

### Mục Tiêu
Tự động release payment từ hold sang teacher wallet sau khi session hoàn thành

### Timeline
**1 tuần** (Week 1)

---

### Step 1.1: Database Schema

#### PaymentRelease Entity

**File:** `src/features/credits/entities/payment-release.entity.ts`

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from '@nestjs/typeorm';
import { PaymentHold } from './payment-hold.entity';
import { User } from '@/features/users/entities/user.entity';

export enum ReleaseStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('payment_releases')
export class PaymentRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentHold)
  paymentHold: PaymentHold;

  @Column()
  paymentHoldId: string;

  @ManyToOne(() => User)
  teacher: User;

  @Column()
  teacherId: string;

  // Amount details
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  teacherAmount: number;

  // Status
  @Column({
    type: 'enum',
    enum: ReleaseStatus,
    default: ReleaseStatus.PENDING,
  })
  status: ReleaseStatus;

  // Conditions
  @Column({ type: 'boolean', default: false })
  sessionCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  attendanceVerified: boolean;

  @Column({ type: 'int', default: 0 })
  attendanceDurationMinutes: number;

  @Column({ type: 'int', default: 0 })
  requiredDurationMinutes: number;

  // Timing
  @Column({ type: 'timestamp', nullable: true })
  sessionEndTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  releaseScheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  releasedAt: Date;

  // Error handling
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### Step 1.2: Auto-Release Service

**File:** `src/features/credits/services/payment-auto-release.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PaymentRelease, ReleaseStatus } from '../entities/payment-release.entity';
import { PaymentHold } from '../entities/payment-hold.entity';
import { CreditTransaction } from '../entities/credit-transaction.entity';
import { User } from '@/features/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentAutoReleaseService {
  private readonly logger = new Logger(PaymentAutoReleaseService.name);
  private readonly PLATFORM_FEE_PERCENTAGE: number;
  private readonly AUTO_RELEASE_DELAY_HOURS: number;

  constructor(
    @InjectRepository(PaymentRelease)
    private readonly paymentReleaseRepository: Repository<PaymentRelease>,
    @InjectRepository(PaymentHold)
    private readonly paymentHoldRepository: Repository<PaymentHold>,
    @InjectRepository(CreditTransaction)
    private readonly creditTransactionRepository: Repository<CreditTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.PLATFORM_FEE_PERCENTAGE = this.configService.get('PLATFORM_FEE_PERCENTAGE', 15);
    this.AUTO_RELEASE_DELAY_HOURS = this.configService.get('AUTO_RELEASE_DELAY_HOURS', 24);
  }

  /**
   * Create payment release record when session completes
   */
  async createReleaseRecord(
    paymentHoldId: string,
    sessionEndTime: Date,
    attendanceDurationMinutes: number,
    requiredDurationMinutes: number,
  ): Promise<PaymentRelease> {
    this.logger.log(`Creating release record for hold ${paymentHoldId}`);

    const paymentHold = await this.paymentHoldRepository.findOne({
      where: { id: paymentHoldId },
      relations: ['teacher'],
    });

    if (!paymentHold) {
      throw new Error('Payment hold not found');
    }

    // Calculate amounts
    const totalAmount = paymentHold.amount;
    const platformFee = totalAmount * (this.PLATFORM_FEE_PERCENTAGE / 100);
    const teacherAmount = totalAmount - platformFee;

    // Check if attendance is sufficient (at least 80% of required duration)
    const attendanceVerified = attendanceDurationMinutes >= (requiredDurationMinutes * 0.8);

    // Schedule release (24 hours after session end)
    const releaseScheduledAt = new Date(sessionEndTime);
    releaseScheduledAt.setHours(releaseScheduledAt.getHours() + this.AUTO_RELEASE_DELAY_HOURS);

    const release = this.paymentReleaseRepository.create({
      paymentHoldId,
      teacherId: paymentHold.teacherId,
      totalAmount,
      platformFee,
      teacherAmount,
      sessionCompleted: true,
      attendanceVerified,
      attendanceDurationMinutes,
      requiredDurationMinutes,
      sessionEndTime,
      releaseScheduledAt,
      status: attendanceVerified ? ReleaseStatus.PENDING : ReleaseStatus.FAILED,
      errorMessage: attendanceVerified ? null : 'Insufficient attendance',
    });

    await this.paymentReleaseRepository.save(release);

    this.logger.log(`Release record created: ${release.id}`);

    return release;
  }

  /**
   * Process pending releases (called by cron job)
   */
  async processPendingReleases(): Promise<void> {
    this.logger.log('Processing pending payment releases...');

    const now = new Date();

    // Find releases that are ready to be processed
    const pendingReleases = await this.paymentReleaseRepository.find({
      where: {
        status: ReleaseStatus.PENDING,
        releaseScheduledAt: LessThan(now),
      },
      relations: ['paymentHold', 'teacher'],
      take: 100, // Process in batches
    });

    this.logger.log(`Found ${pendingReleases.length} releases to process`);

    for (const release of pendingReleases) {
      try {
        await this.processRelease(release);
      } catch (error) {
        this.logger.error(`Failed to process release ${release.id}: ${error.message}`);
        await this.handleReleaseError(release, error);
      }
    }

    this.logger.log('Finished processing pending releases');
  }

  /**
   * Process a single release
   */
  private async processRelease(release: PaymentRelease): Promise<void> {
    this.logger.log(`Processing release ${release.id}`);

    // Update status to processing
    release.status = ReleaseStatus.PROCESSING;
    await this.paymentReleaseRepository.save(release);

    // 1. Update payment hold status
    await this.paymentHoldRepository.update(
      { id: release.paymentHoldId },
      {
        status: 'released',
        releasedAt: new Date(),
        releasePercentage: 100,
      },
    );

    // 2. Credit teacher wallet
    const teacher = await this.userRepository.findOne({
      where: { id: release.teacherId },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    await this.userRepository.update(
      { id: release.teacherId },
      {
        creditBalance: () => `credit_balance + ${release.teacherAmount}`,
      },
    );

    // 3. Create credit transaction for teacher
    const teacherTransaction = this.creditTransactionRepository.create({
      userId: release.teacherId,
      amount: release.teacherAmount,
      type: 'credit',
      description: `Payment released from session`,
      balanceAfter: teacher.creditBalance + release.teacherAmount,
      metadata: {
        releaseId: release.id,
        paymentHoldId: release.paymentHoldId,
        platformFee: release.platformFee,
      },
    });

    await this.creditTransactionRepository.save(teacherTransaction);

    // 4. Create platform fee transaction
    const platformTransaction = this.creditTransactionRepository.create({
      userId: null, // Platform account
      amount: release.platformFee,
      type: 'platform_fee',
      description: `Platform fee from session`,
      metadata: {
        releaseId: release.id,
        teacherId: release.teacherId,
      },
    });

    await this.creditTransactionRepository.save(platformTransaction);

    // 5. Update release status
    release.status = ReleaseStatus.COMPLETED;
    release.releasedAt = new Date();
    await this.paymentReleaseRepository.save(release);

    this.logger.log(`Release ${release.id} completed successfully`);
  }

  /**
   * Handle release error
   */
  private async handleReleaseError(release: PaymentRelease, error: Error): Promise<void> {
    release.status = ReleaseStatus.FAILED;
    release.errorMessage = error.message;
    release.retryCount += 1;

    // Retry up to 3 times
    if (release.retryCount < 3) {
      release.status = ReleaseStatus.PENDING;
      // Retry in 1 hour
      release.releaseScheduledAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    await this.paymentReleaseRepository.save(release);
  }

  /**
   * Get release statistics
   */
  async getReleaseStats(teacherId?: string) {
    const where = teacherId ? { teacherId } : {};

    const [total, pending, completed, failed] = await Promise.all([
      this.paymentReleaseRepository.count({ where }),
      this.paymentReleaseRepository.count({ where: { ...where, status: ReleaseStatus.PENDING } }),
      this.paymentReleaseRepository.count({ where: { ...where, status: ReleaseStatus.COMPLETED } }),
      this.paymentReleaseRepository.count({ where: { ...where, status: ReleaseStatus.FAILED } }),
    ]);

    const totalAmount = await this.paymentReleaseRepository
      .createQueryBuilder('release')
      .select('SUM(release.teacherAmount)', 'total')
      .where(where)
      .andWhere('release.status = :status', { status: ReleaseStatus.COMPLETED })
      .getRawOne();

    return {
      total,
      pending,
      completed,
      failed,
      totalAmountReleased: parseFloat(totalAmount?.total || '0'),
    };
  }
}
```

---

### Step 1.3: Scheduled Job (Cron)

**File:** `src/tasks/payment-release.task.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentAutoReleaseService } from '@/features/credits/services/payment-auto-release.service';

@Injectable()
export class PaymentReleaseTask {
  private readonly logger = new Logger(PaymentReleaseTask.name);

  constructor(
    private readonly paymentAutoReleaseService: PaymentAutoReleaseService,
  ) {}

  /**
   * Run every hour to process pending releases
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePaymentReleases() {
    this.logger.log('Starting payment release cron job');

    try {
      await this.paymentAutoReleaseService.processPendingReleases();
      this.logger.log('Payment release cron job completed');
    } catch (error) {
      this.logger.error(`Payment release cron job failed: ${error.message}`);
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManually() {
    this.logger.log('Manually triggering payment release');
    await this.paymentAutoReleaseService.processPendingReleases();
  }
}
```

---

### Step 1.4: Integration with Session Completion

**File:** `src/features/courses/services/session-completion.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from '@nestjs/typeorm';
import { CourseSession } from '../entities/course-session.entity';
import { SessionPurchase } from '../entities/session-purchase.entity';
import { PaymentAutoReleaseService } from '@/features/credits/services/payment-auto-release.service';

@Injectable()
export class SessionCompletionService {
  private readonly logger = new Logger(SessionCompletionService.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private readonly purchaseRepository: Repository<SessionPurchase>,
    private readonly paymentAutoReleaseService: PaymentAutoReleaseService,
  ) {}

  /**
   * Mark session as completed and trigger payment release
   */
  async completeSession(sessionId: string): Promise<void> {
    this.logger.log(`Completing session ${sessionId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Update session status
    session.status = 'completed';
    await this.sessionRepository.save(session);

    // Get all purchases for this session
    const purchases = await this.purchaseRepository.find({
      where: { sessionId },
      relations: ['paymentHolds'],
    });

    this.logger.log(`Found ${purchases.length} purchases for session ${sessionId}`);

    // Create release records for each purchase
    for (const purchase of purchases) {
      if (purchase.paymentHolds && purchase.paymentHolds.length > 0) {
        const paymentHold = purchase.paymentHolds[0];

        await this.paymentAutoReleaseService.createReleaseRecord(
          paymentHold.id,
          new Date(), // session end time
          purchase.attendanceDurationMinutes,
          session.durationMinutes,
        );
      }
    }

    this.logger.log(`Session ${sessionId} completed and releases scheduled`);
  }
}
```

---

## 💼 FEATURE 2: Commission System

### Mục Tiêu
Tính toán và quản lý commission cho platform

### Timeline
**3 ngày** (Week 1)

---

### Step 2.1: Commission Configuration

**File:** `src/core/payment/configs/commission.config.ts`

```typescript
export interface CommissionTier {
  minRevenue: number;
  maxRevenue: number;
  percentage: number;
}

export const COMMISSION_TIERS: CommissionTier[] = [
  { minRevenue: 0, maxRevenue: 1000, percentage: 20 },        // 20% for first $1000
  { minRevenue: 1000, maxRevenue: 5000, percentage: 15 },     // 15% for $1000-$5000
  { minRevenue: 5000, maxRevenue: 10000, percentage: 12 },    // 12% for $5000-$10000
  { minRevenue: 10000, maxRevenue: Infinity, percentage: 10 }, // 10% for $10000+
];

export const DEFAULT_PLATFORM_FEE = 15; // 15% default
```

---

### Step 2.2: Commission Service

**File:** `src/core/payment/services/commission.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { COMMISSION_TIERS, DEFAULT_PLATFORM_FEE } from '../configs/commission.config';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  /**
   * Calculate commission based on teacher's total revenue
   */
  calculateCommission(amount: number, teacherTotalRevenue: number): {
    platformFee: number;
    teacherAmount: number;
    commissionPercentage: number;
  } {
    // Find applicable tier
    const tier = COMMISSION_TIERS.find(
      t => teacherTotalRevenue >= t.minRevenue && teacherTotalRevenue < t.maxRevenue,
    );

    const commissionPercentage = tier?.percentage || DEFAULT_PLATFORM_FEE;
    const platformFee = amount * (commissionPercentage / 100);
    const teacherAmount = amount - platformFee;

    return {
      platformFee,
      teacherAmount,
      commissionPercentage,
    };
  }

  /**
   * Get teacher's commission tier
   */
  getTeacherTier(totalRevenue: number): {
    tier: number;
    percentage: number;
    nextTierAt: number;
  } {
    const tierIndex = COMMISSION_TIERS.findIndex(
      t => totalRevenue >= t.minRevenue && totalRevenue < t.maxRevenue,
    );

    const currentTier = COMMISSION_TIERS[tierIndex];
    const nextTier = COMMISSION_TIERS[tierIndex + 1];

    return {
      tier: tierIndex + 1,
      percentage: currentTier.percentage,
      nextTierAt: nextTier?.minRevenue || Infinity,
    };
  }
}
```

---

## 💸 FEATURE 3: Teacher Payout

### Mục Tiêu
Cho phép teacher rút tiền từ wallet

### Timeline
**1 tuần** (Week 2)

---

### Step 3.1: Payout Entity

**File:** `src/features/wallet/entities/payout.entity.ts`

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from '@nestjs/typeorm';
import { User } from '@/features/users/entities/user.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  teacher: User;

  @Column()
  teacherId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PayoutMethod,
  })
  method: PayoutMethod;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  // Bank details (encrypted)
  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    accountNumber?: string;
    routingNumber?: string;
    accountName?: string;
    bankName?: string;
  };

  // PayPal details
  @Column({ nullable: true })
  paypalEmail: string;

  // Processing
  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### Step 3.2: Payout Service

**File:** `src/features/wallet/services/payout.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout, PayoutStatus, PayoutMethod } from '../entities/payout.entity';
import { User } from '@/features/users/entities/user.entity';
import { CreditTransaction } from '@/features/credits/entities/credit-transaction.entity';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly MIN_PAYOUT_AMOUNT = 50; // Minimum $50

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
  ) {}

  /**
   * Request payout
   */
  async requestPayout(
    teacherId: string,
    amount: number,
    method: PayoutMethod,
    details: any,
  ): Promise<Payout> {
    this.logger.log(`Teacher ${teacherId} requesting payout of $${amount}`);

    // Validate amount
    if (amount < this.MIN_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is $${this.MIN_PAYOUT_AMOUNT}`);
    }

    // Check teacher balance
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    if (teacher.creditBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct from balance
    await this.userRepository.update(
      { id: teacherId },
      {
        creditBalance: () => `credit_balance - ${amount}`,
      },
    );

    // Create payout record
    const payout = this.payoutRepository.create({
      teacherId,
      amount,
      method,
      status: PayoutStatus.PENDING,
      ...(method === PayoutMethod.BANK_TRANSFER && { bankDetails: details }),
      ...(method === PayoutMethod.PAYPAL && { paypalEmail: details.email }),
    });

    await this.payoutRepository.save(payout);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      userId: teacherId,
      amount: -amount,
      type: 'payout',
      description: `Payout request via ${method}`,
      balanceAfter: teacher.creditBalance - amount,
      metadata: {
        payoutId: payout.id,
        method,
      },
    });

    await this.transactionRepository.save(transaction);

    this.logger.log(`Payout request created: ${payout.id}`);

    return payout;
  }

  /**
   * Process payout (admin action or automated)
   */
  async processPayout(payoutId: string): Promise<void> {
    this.logger.log(`Processing payout ${payoutId}`);

    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new Error('Payout already processed');
    }

    // Update status
    payout.status = PayoutStatus.PROCESSING;
    await this.payoutRepository.save(payout);

    try {
      // Process based on method
      let transactionId: string;

      switch (payout.method) {
        case PayoutMethod.BANK_TRANSFER:
          transactionId = await this.processBankTransfer(payout);
          break;
        case PayoutMethod.PAYPAL:
          transactionId = await this.processPayPal(payout);
          break;
        case PayoutMethod.STRIPE:
          transactionId = await this.processStripe(payout);
          break;
        default:
          throw new Error('Invalid payout method');
      }

      // Update payout
      payout.status = PayoutStatus.COMPLETED;
      payout.transactionId = transactionId;
      payout.processedAt = new Date();
      await this.payoutRepository.save(payout);

      this.logger.log(`Payout ${payoutId} completed`);
    } catch (error) {
      this.logger.error(`Payout ${payoutId} failed: ${error.message}`);

      // Refund to teacher balance
      await this.userRepository.update(
        { id: payout.teacherId },
        {
          creditBalance: () => `credit_balance + ${payout.amount}`,
        },
      );

      // Update payout
      payout.status = PayoutStatus.FAILED;
      payout.errorMessage = error.message;
      await this.payoutRepository.save(payout);

      throw error;
    }
  }

  private async processBankTransfer(payout: Payout): Promise<string> {
    // Integrate with bank API
    // This is a placeholder
    return `BANK_${Date.now()}`;
  }

  private async processPayPal(payout: Payout): Promise<string> {
    // Integrate with PayPal API
    // This is a placeholder
    return `PAYPAL_${Date.now()}`;
  }

  private async processStripe(payout: Payout): Promise<string> {
    // Integrate with Stripe API
    // This is a placeholder
    return `STRIPE_${Date.now()}`;
  }
}
```

---

## 📹 FEATURE 4: Recording System

### Mục Tiêu
Cloud recording với LiveKit Egress

### Timeline
**1 tuần** (Week 3)

**Chi tiết:** Xem `docs/PHASE7_ADVANCED_FEATURES_GUIDE.md` - Recording Module

---

## 🤖 FEATURE 5: AI Features

### Mục Tiêu
Transcription, Translation, Summarization

### Timeline
**1 tuần** (Week 4)

**Chi tiết:** Xem `docs/PHASE7_ADVANCED_FEATURES_GUIDE.md` - AI Features

---

## 📊 FEATURE 6: Advanced Analytics

### Mục Tiêu
Comprehensive analytics dashboard

### Timeline
**1 tuần** (Week 5)

**Chi tiết:** Xem `docs/PHASE7_ADVANCED_FEATURES_GUIDE.md` - Analytics Module

---

## 💎 FEATURE 7: Premium Tier

### Mục Tiêu
Launch premium subscription tier

### Timeline
**3 ngày** (Week 5)

---

### Step 7.1: Subscription Entity

**File:** `src/features/subscriptions/entities/subscription.entity.ts`

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from '@nestjs/typeorm';
import { User } from '@/features/users/entities/user.entity';

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRIAL = 'trial',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextBillingDate: Date;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### Step 7.2: Premium Features Config

**File:** `src/core/premium/configs/premium-features.config.ts`

```typescript
export const PREMIUM_FEATURES = {
  FREE: {
    recording: false,
    transcription: false,
    translation: false,
    maxRoomDuration: 60, // minutes
    maxParticipants: 10,
    storageGB: 1,
    analytics: 'basic',
    support: 'community',
  },
  PREMIUM: {
    recording: true,
    transcription: true,
    translation: true,
    maxRoomDuration: 240, // 4 hours
    maxParticipants: 100,
    storageGB: 50,
    analytics: 'advanced',
    support: 'priority',
  },
  ENTERPRISE: {
    recording: true,
    transcription: true,
    translation: true,
    maxRoomDuration: -1, // unlimited
    maxParticipants: 500,
    storageGB: 500,
    analytics: 'enterprise',
    support: 'dedicated',
  },
};

export const SUBSCRIPTION_PRICES = {
  PREMIUM: 29.99, // per month
  ENTERPRISE: 99.99, // per month
};
```

---

## 📊 PROGRESS TRACKING

### Implementation Timeline

```
Week 1:  Feature 1 (Auto-Release) + Feature 2 (Commission)
Week 2:  Feature 3 (Teacher Payout)
Week 3:  Feature 4 (Recording)
Week 4:  Feature 5 (AI Features)
Week 5:  Feature 6 (Analytics) + Feature 7 (Premium)
```

### Checklist

#### Phase 3 Completion (Auto-Release)
- [ ] PaymentRelease entity created
- [ ] Auto-release service implemented
- [ ] Cron job setup
- [ ] Integration with session completion
- [ ] Testing completed
- [ ] Deployed to production

#### Commission System
- [ ] Commission tiers configured
- [ ] Commission service implemented
- [ ] Integration with payment release
- [ ] Testing completed

#### Teacher Payout
- [ ] Payout entity created
- [ ] Payout service implemented
- [ ] Bank transfer integration
- [ ] PayPal integration
- [ ] Admin dashboard for approvals
- [ ] Testing completed

#### Recording System
- [ ] LiveKit Egress integration
- [ ] S3 storage setup
- [ ] Recording entity created
- [ ] Recording service implemented
- [ ] Post-processing pipeline
- [ ] Testing completed

#### AI Features
- [ ] OpenAI API integration
- [ ] Transcription service
- [ ] Translation service
- [ ] Summarization service
- [ ] Testing completed

#### Analytics
- [ ] Analytics entities created
- [ ] Event tracking implemented
- [ ] Dashboard created
- [ ] Reports generated
- [ ] Testing completed

#### Premium Tier
- [ ] Subscription entity created
- [ ] Subscription service implemented
- [ ] Payment integration
- [ ] Feature gates implemented
- [ ] Pricing page created
- [ ] Testing completed

---

## 🎯 SUCCESS CRITERIA

### Business Metrics

- ✅ Auto-release working for 100% of sessions
- ✅ Commission calculated correctly
- ✅ Teacher payout < 3 business days
- ✅ Recording success rate > 95%
- ✅ AI transcription accuracy > 90%
- ✅ Premium conversion rate > 5%

### Technical Metrics

- ✅ All features tested
- ✅ Test coverage > 80%
- ✅ No performance degradation
- ✅ Error rate < 1%
- ✅ Uptime > 99.9%

---

**Tài liệu này sẽ được cập nhật liên tục khi hoàn thành từng feature.**
