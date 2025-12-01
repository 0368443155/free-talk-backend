# 🚀 Phase 3: Payment Auto-Release Implementation Plan

**Timeline**: 5 days  
**Status**: 🟢 Ready to Start  
**Dependencies**: Phase 1 ✅, Phase 2 ✅, Migration ⏳

---

## 📅 Day 1: Database Schema & Entities

### Morning: Create Entities (3 hours)

#### 1.1 Transaction Entity
**File**: `src/features/payments/entities/transaction.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  PURCHASE = 'purchase',
  REFUND = 'refund',
  COMMISSION = 'commission',
  PAYMENT_RELEASE = 'payment_release',
  WITHDRAWAL = 'withdrawal',
  ADMIN_CREDIT = 'admin_credit',
  ADMIN_DEBIT = 'admin_debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transactions')
@Index(['user_id'])
@Index(['type'])
@Index(['status'])
@Index(['created_at'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_after: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reference_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    course_id?: string;
    session_id?: string;
    lesson_id?: string;
    commission_rate?: number;
    attendance_percentage?: number;
    original_amount?: number;
    platform_fee?: number;
    [key: string]: any;
  };

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

#### 1.2 Withdrawal Entity
**File**: `src/features/payments/entities/withdrawal.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity('withdrawals')
@Index(['teacher_id'])
@Index(['status'])
@Index(['requested_at'])
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  teacher_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ type: 'json' })
  bank_account_info: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch?: string;
    swift_code?: string;
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;
}
```

#### 1.3 AttendanceRecord Entity
**File**: `src/features/courses/entities/attendance-record.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { CourseSession } from './course-session.entity';

export enum AttendanceStatus {
  ABSENT = 'absent',
  PRESENT = 'present',
  LATE = 'late',
}

@Entity('attendance_records')
@Index(['session_id'])
@Index(['user_id'])
@Index(['session_id', 'user_id'], { unique: true })
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  session_id: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'timestamp', nullable: true })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  @Column({ type: 'int', default: 0 })
  duration_minutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendance_percentage: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: AttendanceStatus,
    default: AttendanceStatus.ABSENT,
  })
  status: AttendanceStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => CourseSession, { eager: false })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### Afternoon: Create Migration (2 hours)

#### 1.4 Migration File
**File**: `src/database/migrations/1733054400000-CreatePhase3Tables.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase3Tables1733054400000 implements MigrationInterface {
  name = 'CreatePhase3Tables1733054400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create transactions table
    await queryRunner.query(`
      CREATE TABLE transactions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        reference_type VARCHAR(50) NULL,
        reference_id VARCHAR(36) NULL,
        description TEXT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        INDEX idx_user (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    // 2. Create withdrawals table
    await queryRunner.query(`
      CREATE TABLE withdrawals (
        id VARCHAR(36) PRIMARY KEY,
        teacher_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        bank_account_info JSON NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        notes TEXT NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_teacher (teacher_id),
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at)
      )
    `);

    // 3. Create attendance_records table
    await queryRunner.query(`
      CREATE TABLE attendance_records (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        joined_at TIMESTAMP NULL,
        left_at TIMESTAMP NULL,
        duration_minutes INT DEFAULT 0,
        attendance_percentage DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'absent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_session_user (session_id, user_id),
        INDEX idx_session (session_id),
        INDEX idx_user (user_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS withdrawals`);
    await queryRunner.query(`DROP TABLE IF EXISTS transactions`);
  }
}
```

### Testing (1 hour)
```bash
# Run migration
npm run migration:run

# Verify tables created
mysql -u root -p -e "SHOW TABLES LIKE '%transaction%'" talkconnect
mysql -u root -p -e "SHOW TABLES LIKE '%withdrawal%'" talkconnect
mysql -u root -p -e "SHOW TABLES LIKE '%attendance%'" talkconnect
```

---

## 📅 Day 2: Attendance Tracking Service

### Morning: LiveKit Webhook Handler (3 hours)

#### 2.1 Attendance Service
**File**: `src/features/courses/attendance.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { CourseSession } from './entities/course-session.entity';
import { SessionPurchase } from './entities/session-purchase.entity';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private purchaseRepository: Repository<SessionPurchase>,
  ) {}

  /**
   * Track when participant joins
   */
  async trackJoin(sessionId: string, userId: string, joinedAt: Date) {
    this.logger.log(`Tracking join: session=${sessionId}, user=${userId}`);

    let attendance = await this.attendanceRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        session_id: sessionId,
        user_id: userId,
        joined_at: joinedAt,
        status: AttendanceStatus.PRESENT,
      });
    } else {
      attendance.joined_at = joinedAt;
      attendance.status = AttendanceStatus.PRESENT;
    }

    await this.attendanceRepository.save(attendance);
    this.logger.log(`✅ Join tracked for user ${userId}`);

    return attendance;
  }

  /**
   * Track when participant leaves
   */
  async trackLeave(sessionId: string, userId: string, leftAt: Date) {
    this.logger.log(`Tracking leave: session=${sessionId}, user=${userId}`);

    const attendance = await this.attendanceRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
      relations: ['session'],
    });

    if (!attendance) {
      this.logger.warn(`No attendance record found for user ${userId}`);
      return null;
    }

    // Calculate duration
    const joinedAt = attendance.joined_at;
    const durationMs = leftAt.getTime() - joinedAt.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Calculate attendance percentage
    const sessionDuration = attendance.session.duration_minutes || 60;
    const attendancePercentage = (durationMinutes / sessionDuration) * 100;

    // Update attendance
    attendance.left_at = leftAt;
    attendance.duration_minutes = durationMinutes;
    attendance.attendance_percentage = Math.min(100, attendancePercentage);

    // Update status
    if (attendancePercentage >= 20) {
      attendance.status = AttendanceStatus.PRESENT;
    } else {
      attendance.status = AttendanceStatus.ABSENT;
    }

    await this.attendanceRepository.save(attendance);

    // Update session purchase if exists
    const purchase = await this.purchaseRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (purchase) {
      purchase.attendance_duration_minutes = durationMinutes;
      purchase.attended = attendancePercentage >= 20;
      await this.purchaseRepository.save(purchase);
    }

    this.logger.log(
      `✅ Leave tracked: duration=${durationMinutes}min, attendance=${attendancePercentage.toFixed(2)}%`,
    );

    return attendance;
  }

  /**
   * Get attendance for session
   */
  async getSessionAttendance(sessionId: string) {
    return this.attendanceRepository.find({
      where: { session_id: sessionId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get user attendance for all sessions
   */
  async getUserAttendance(userId: string) {
    return this.attendanceRepository.find({
      where: { user_id: userId },
      relations: ['session', 'session.course'],
      order: { created_at: 'DESC' },
    });
  }
}
```

#### 2.2 LiveKit Webhook Controller
**File**: `src/features/livekit/livekit-webhook.controller.ts`

```typescript
import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from '../courses/attendance.service';
import { CourseSession } from '../courses/entities/course-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('LiveKit Webhooks')
@Controller('webhooks/livekit')
export class LiveKitWebhookController {
  private readonly logger = new Logger(LiveKitWebhookController.name);

  constructor(
    private attendanceService: AttendanceService,
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Handle LiveKit webhooks' })
  async handleWebhook(
    @Body() event: any,
    @Headers('livekit-signature') signature: string,
  ) {
    this.logger.log(`Received webhook: ${event.event}`);

    // TODO: Verify webhook signature
    // const isValid = await this.livekitService.verifyWebhookSignature(event, signature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }

    switch (event.event) {
      case 'participant_joined':
        return this.handleParticipantJoined(event);
      case 'participant_left':
        return this.handleParticipantLeft(event);
      case 'room_finished':
        return this.handleRoomFinished(event);
      default:
        this.logger.log(`Unhandled event: ${event.event}`);
        return { message: 'Event received' };
    }
  }

  private async handleParticipantJoined(event: any) {
    const roomName = event.room.name;
    const userId = event.participant.identity;
    const joinedAt = new Date(event.participant.joined_at * 1000);

    // Parse room name: "course_{courseId}_session_{sessionNumber}_lesson_{lessonNumber}"
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 6) {
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3]);

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      this.logger.warn(`Session not found: course=${courseId}, session=${sessionNumber}`);
      return { message: 'Session not found' };
    }

    // Track attendance
    await this.attendanceService.trackJoin(session.id, userId, joinedAt);

    return {
      message: 'Attendance recorded',
      session_id: session.id,
      user_id: userId,
      joined_at: joinedAt,
    };
  }

  private async handleParticipantLeft(event: any) {
    const roomName = event.room.name;
    const userId = event.participant.identity;
    const leftAt = new Date(event.created_at * 1000);

    // Parse room name
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 6) {
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3]);

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      return { message: 'Session not found' };
    }

    // Track leave
    const attendance = await this.attendanceService.trackLeave(
      session.id,
      userId,
      leftAt,
    );

    return {
      message: 'Attendance updated',
      session_id: session.id,
      user_id: userId,
      duration_minutes: attendance?.duration_minutes,
      attendance_percentage: attendance?.attendance_percentage,
    };
  }

  private async handleRoomFinished(event: any) {
    const roomName = event.room.name;

    // Parse room name
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 6) {
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3]);

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      return { message: 'Session not found' };
    }

    // Mark session as completed
    session.status = 'completed';
    await this.sessionRepository.save(session);

    this.logger.log(`Session ${session.id} marked as completed`);

    return {
      message: 'Session marked as completed',
      session_id: session.id,
    };
  }
}
```

### Afternoon: Testing (2 hours)

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/livekit \
  -H "Content-Type: application/json" \
  -d '{
    "event": "participant_joined",
    "room": {
      "name": "course_123_session_1_lesson_1"
    },
    "participant": {
      "identity": "user_456",
      "joined_at": 1733054400
    }
  }'
```

---

## 📅 Day 3: Payment Release Service

### Morning: Payment Release Logic (3 hours)

#### 3.1 Payment Release Service
**File**: `src/features/payments/payment-release.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CourseSession, SessionStatus } from '../courses/entities/course-session.entity';
import { SessionPurchase, PurchaseStatus } from '../courses/entities/session-purchase.entity';
import { PaymentHold, HoldStatus } from '../courses/entities/payment-hold.entity';
import { AttendanceRecord } from '../courses/entities/attendance-record.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class PaymentReleaseService {
  private readonly logger = new Logger(PaymentReleaseService.name);

  constructor(
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private purchaseRepository: Repository<SessionPurchase>,
    @InjectRepository(PaymentHold)
    private holdRepository: Repository<PaymentHold>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Cron job: Auto-release payments every 5 minutes
   */
  @Cron('*/5 * * * *')
  async autoReleasePayments() {
    this.logger.log('🔄 Running auto-release payments cron job...');

    // Find completed sessions with pending payment holds
    const completedSessions = await this.sessionRepository.find({
      where: { status: SessionStatus.COMPLETED },
      relations: ['course'],
    });

    this.logger.log(`Found ${completedSessions.length} completed sessions`);

    for (const session of completedSessions) {
      try {
        await this.processSessionPayments(session);
      } catch (error) {
        this.logger.error(
          `Error processing session ${session.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('✅ Auto-release payments completed');
  }

  /**
   * Process payments for a completed session
   */
  private async processSessionPayments(session: CourseSession) {
    this.logger.log(`Processing payments for session ${session.id}`);

    // Find all purchases for this session
    const purchases = await this.purchaseRepository.find({
      where: {
        session_id: session.id,
        status: PurchaseStatus.ACTIVE,
      },
    });

    this.logger.log(`Found ${purchases.length} purchases to process`);

    for (const purchase of purchases) {
      try {
        // Find payment hold
        const hold = await this.holdRepository.findOne({
          where: {
            session_purchase_id: purchase.id,
            status: HoldStatus.HELD,
          },
        });

        if (!hold) {
          this.logger.warn(`No payment hold found for purchase ${purchase.id}`);
          continue;
        }

        // Find attendance record
        const attendance = await this.attendanceRepository.findOne({
          where: {
            session_id: session.id,
            user_id: purchase.user_id,
          },
        });

        const attendancePercentage = attendance?.attendance_percentage || 0;

        this.logger.log(
          `Purchase ${purchase.id}: attendance=${attendancePercentage}%`,
        );

        // Decide: release or refund
        if (attendancePercentage >= 20) {
          await this.releaseToTeacher(hold, session, attendancePercentage);
        } else {
          await this.refundToStudent(hold, session, attendancePercentage);
        }
      } catch (error) {
        this.logger.error(
          `Error processing purchase ${purchase.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Release payment to teacher
   */
  private async releaseToTeacher(
    hold: PaymentHold,
    session: CourseSession,
    attendancePercentage: number,
  ) {
    this.logger.log(`Releasing payment to teacher for hold ${hold.id}`);

    await this.dataSource.transaction(async (manager) => {
      // Calculate commission
      const teacher = await manager.findOne(User, {
        where: { id: hold.teacher_id },
      });

      // Commission: 30% if referred, 0% otherwise
      const commissionRate = teacher?.referred_by ? 0.3 : 0;
      const platformFee = hold.amount * commissionRate;
      const teacherAmount = hold.amount - platformFee;

      // Update teacher balance
      await manager.increment(
        User,
        { id: hold.teacher_id },
        'credit_balance',
        teacherAmount,
      );

      // Create transaction for teacher
      const teacherBalanceBefore = teacher?.credit_balance || 0;
      await manager.save(Transaction, {
        user_id: hold.teacher_id,
        type: TransactionType.PAYMENT_RELEASE,
        amount: teacherAmount,
        balance_before: teacherBalanceBefore,
        balance_after: teacherBalanceBefore + teacherAmount,
        status: TransactionStatus.COMPLETED,
        reference_type: 'payment_hold',
        reference_id: hold.id,
        description: `Payment released for session ${session.title}`,
        metadata: {
          session_id: session.id,
          course_id: session.course_id,
          attendance_percentage: attendancePercentage,
          original_amount: hold.amount,
          platform_fee: platformFee,
          commission_rate: commissionRate,
        },
        completed_at: new Date(),
      });

      // Create commission transaction if applicable
      if (platformFee > 0) {
        await manager.save(Transaction, {
          user_id: hold.teacher_id,
          type: TransactionType.COMMISSION,
          amount: -platformFee,
          balance_before: teacherBalanceBefore + teacherAmount,
          balance_after: teacherBalanceBefore + teacherAmount,
          status: TransactionStatus.COMPLETED,
          reference_type: 'payment_hold',
          reference_id: hold.id,
          description: `Platform commission (${commissionRate * 100}%)`,
          metadata: {
            commission_rate: commissionRate,
            original_amount: hold.amount,
          },
          completed_at: new Date(),
        });
      }

      // Update payment hold
      hold.status = HoldStatus.RELEASED;
      hold.released_at = new Date();
      hold.release_percentage = attendancePercentage;
      hold.notes = `Released to teacher (attendance: ${attendancePercentage}%)`;
      await manager.save(PaymentHold, hold);

      this.logger.log(
        `✅ Payment released: teacher=${hold.teacher_id}, amount=${teacherAmount}, fee=${platformFee}`,
      );
    });
  }

  /**
   * Refund payment to student
   */
  private async refundToStudent(
    hold: PaymentHold,
    session: CourseSession,
    attendancePercentage: number,
  ) {
    this.logger.log(`Refunding payment to student for hold ${hold.id}`);

    await this.dataSource.transaction(async (manager) => {
      // Refund to student
      const student = await manager.findOne(User, {
        where: { id: hold.student_id },
      });

      await manager.increment(
        User,
        { id: hold.student_id },
        'credit_balance',
        hold.amount,
      );

      // Create refund transaction
      const studentBalanceBefore = student?.credit_balance || 0;
      await manager.save(Transaction, {
        user_id: hold.student_id,
        type: TransactionType.REFUND,
        amount: hold.amount,
        balance_before: studentBalanceBefore,
        balance_after: studentBalanceBefore + hold.amount,
        status: TransactionStatus.COMPLETED,
        reference_type: 'payment_hold',
        reference_id: hold.id,
        description: `Refund for session ${session.title} (low attendance)`,
        metadata: {
          session_id: session.id,
          course_id: session.course_id,
          attendance_percentage: attendancePercentage,
          reason: 'attendance_below_threshold',
        },
        completed_at: new Date(),
      });

      // Update payment hold
      hold.status = HoldStatus.REFUNDED;
      hold.released_at = new Date();
      hold.release_percentage = attendancePercentage;
      hold.notes = `Refunded to student (attendance: ${attendancePercentage}%)`;
      await manager.save(PaymentHold, hold);

      // Update session purchase
      await manager.update(SessionPurchase, { id: hold.session_purchase_id }, {
        refund_amount: hold.amount,
        status: PurchaseStatus.REFUNDED,
      });

      this.logger.log(
        `✅ Payment refunded: student=${hold.student_id}, amount=${hold.amount}`,
      );
    });
  }
}
```

### Afternoon: Testing (2 hours)

```typescript
// Test payment release manually
const service = app.get(PaymentReleaseService);
await service.autoReleasePayments();
```

---

## 📅 Day 4: Withdrawal System

### Implementation (4 hours)

#### 4.1 Withdrawal Service
**File**: `src/features/payments/withdrawal.service.ts`

#### 4.2 Withdrawal Controller
**File**: `src/features/payments/withdrawal.controller.ts`

#### 4.3 Admin Withdrawal Controller
**File**: `src/features/admin/admin-withdrawal.controller.ts`

### Testing (2 hours)

---

## 📅 Day 5: Revenue Dashboard & Frontend

### Backend: Revenue API (2 hours)

#### 5.1 Revenue Service
**File**: `src/features/payments/revenue.service.ts`

#### 5.2 Revenue Controller
**File**: `src/features/payments/revenue.controller.ts`

### Frontend: Dashboard (4 hours)

#### 5.3 Teacher Revenue Page
**File**: `talkplatform-frontend/src/app/teacher/revenue/page.tsx`

#### 5.4 Withdrawal Request Page
**File**: `talkplatform-frontend/src/app/teacher/revenue/withdraw/page.tsx`

---

## ✅ Checklist

### Day 1
- [ ] Create Transaction entity
- [ ] Create Withdrawal entity
- [ ] Create AttendanceRecord entity
- [ ] Create migration file
- [ ] Run migration
- [ ] Verify tables created

### Day 2
- [ ] Create AttendanceService
- [ ] Create LiveKitWebhookController
- [ ] Test participant_joined webhook
- [ ] Test participant_left webhook
- [ ] Test room_finished webhook

### Day 3
- [ ] Create PaymentReleaseService
- [ ] Implement autoReleasePayments cron
- [ ] Implement releaseToTeacher
- [ ] Implement refundToStudent
- [ ] Test payment release flow

### Day 4
- [ ] Create WithdrawalService
- [ ] Create WithdrawalController
- [ ] Create AdminWithdrawalController
- [ ] Test withdrawal request
- [ ] Test withdrawal approval/rejection

### Day 5
- [ ] Create RevenueService
- [ ] Create RevenueController
- [ ] Create Teacher Revenue Dashboard
- [ ] Create Withdrawal Request Form
- [ ] End-to-end testing

---

**Ready to start Phase 3!** 🚀
