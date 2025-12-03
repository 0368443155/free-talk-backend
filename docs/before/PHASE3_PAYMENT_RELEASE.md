# 📚 Phase 3: Payment Auto-Release & Commission System

**Version**: 1.0  
**Status**: ⏳ **PENDING**  
**Priority**: Critical  
**Estimated Time**: 4-5 days  
**Dependencies**: Phase 1 (Courses), Phase 2 (Enrollments)

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Entity Definitions](#entity-definitions)
4. [Business Logic Flows](#business-logic-flows)
5. [LiveKit Webhook Integration](#livekit-webhook-integration)
6. [Cron Job Implementation](#cron-job-implementation)
7. [Commission Calculation](#commission-calculation)
8. [API Endpoints](#api-endpoints)
9. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Automatically release held payments to teachers after session completion based on student attendance. Calculate and distribute platform commissions. Enable teachers to withdraw their earnings.

### Key Features

- ✅ Track student attendance via LiveKit webhooks
- ✅ Auto-release payments (>= 20% attendance)
- ✅ Auto-refund to students (< 20% attendance)
- ✅ Commission calculation (70% or 30%)
- ✅ Teacher withdrawal system
- ✅ Transaction history tracking
- ✅ Revenue dashboard for teachers
- ✅ Admin withdrawal approval

### Payment Release Rules

```
Session Ends
     ↓
Calculate Attendance %
     ↓
  >= 20%?
   ↙    ↘
 YES    NO
  ↓      ↓
Release Refund
to      to
Teacher Student
  ↓
Apply Commission
(70% or 30%)
```

### Commission Structure

- **Teacher Referred by Another Teacher**: 30% commission to platform, 70% to teacher
- **Direct Teacher (No Referral)**: 0% commission, 100% to teacher

---

## 🗄️ Database Schema

### Tables Overview

```
transactions
├── id (PK)
├── user_id (FK → users.id)
├── type (deposit, purchase, refund, commission, payment_release, withdrawal)
├── amount
├── balance_before
├── balance_after
├── status (pending, completed, failed)
├── reference_type (enrollment, session_purchase, payment_hold, withdrawal)
├── reference_id
├── description
├── metadata (JSON)
├── created_at
└── completed_at

withdrawals
├── id (PK)
├── teacher_id (FK → users.id)
├── amount
├── status (pending, processing, completed, rejected)
├── bank_account_info (JSON)
├── requested_at
├── processed_at
├── completed_at
├── notes
├── admin_notes
├── created_at
└── updated_at

attendance_records
├── id (PK)
├── session_id (FK → course_sessions.id)
├── user_id (FK → users.id)
├── joined_at
├── left_at
├── duration_minutes
├── attendance_percentage
├── status (absent, present, late)
├── created_at
└── updated_at
```

### Entity Relationships

```
User (Student)
  ├── has many Transactions
  └── has many AttendanceRecords

User (Teacher)
  ├── has many Transactions
  └── has many Withdrawals

CourseSession
  └── has many AttendanceRecords

PaymentHold
  └── triggers Transaction (on release/refund)

Withdrawal
  └── creates Transaction (on completion)
```

---

## 🔧 Entity Definitions

### 1. Transaction Entity

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
  REFERRAL_BONUS = 'referral_bonus',
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

  // User who owns this transaction
  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  // Transaction Type
  @Column({
    type: 'varchar',
    length: 50,
    enum: TransactionType,
  })
  type: TransactionType;

  // Amount (positive for credit, negative for debit)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Balance tracking
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_after: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  // Reference to related entity
  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string; // 'enrollment', 'session_purchase', 'payment_hold', 'withdrawal'

  @Column({ type: 'varchar', length: 36, nullable: true })
  reference_id: string;

  // Description
  @Column({ type: 'text', nullable: true })
  description: string;

  // Additional metadata (JSON)
  @Column({ type: 'json', nullable: true })
  metadata: {
    course_id?: string;
    session_id?: string;
    commission_rate?: number;
    attendance_percentage?: number;
    original_amount?: number;
    platform_fee?: number;
    [key: string]: any;
  };

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | User who owns this transaction |
| `type` | Enum | Yes | Transaction type |
| `amount` | Decimal(10,2) | Yes | Transaction amount (+ or -) |
| `balance_before` | Decimal(10,2) | Yes | User balance before transaction |
| `balance_after` | Decimal(10,2) | Yes | User balance after transaction |
| `status` | Enum | Yes | Transaction status |
| `reference_type` | String(50) | No | Type of related entity |
| `reference_id` | UUID | No | ID of related entity |
| `description` | Text | No | Human-readable description |
| `metadata` | JSON | No | Additional data |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `completed_at` | Timestamp | No | Completion timestamp |

**Business Rules**:

1. All financial operations must create a transaction record
2. `balance_after` must equal `balance_before + amount`
3. Transaction is immutable once `status = 'completed'`
4. `metadata` stores audit trail information
5. `amount` is positive for credits, negative for debits

---

### 2. Withdrawal Entity

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

  // Teacher requesting withdrawal
  @Column({ type: 'varchar', length: 36 })
  teacher_id: string;

  // Amount to withdraw
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  // Bank Account Information (JSON)
  @Column({ type: 'json' })
  bank_account_info: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch?: string;
    swift_code?: string;
  };

  // Dates
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string; // Teacher's notes

  @Column({ type: 'text', nullable: true })
  admin_notes: string; // Admin's notes

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `teacher_id` | UUID | Yes | Teacher requesting withdrawal |
| `amount` | Decimal(10,2) | Yes | Amount to withdraw |
| `status` | Enum | Yes | Withdrawal status |
| `bank_account_info` | JSON | Yes | Bank details |
| `requested_at` | Timestamp | Yes | When requested |
| `processed_at` | Timestamp | No | When admin started processing |
| `completed_at` | Timestamp | No | When completed |
| `notes` | Text | No | Teacher's notes |
| `admin_notes` | Text | No | Admin's notes |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. Teacher must be verified to request withdrawal
2. Amount must be <= teacher's available balance
3. Minimum withdrawal amount: $10
4. Status flow: pending → processing → completed/rejected
5. Balance is deducted when status changes to 'processing'
6. If rejected, balance is restored

---

### 3. AttendanceRecord Entity

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

  // Session reference
  @Column({ type: 'varchar', length: 36 })
  session_id: string;

  // Student reference
  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  // Attendance times
  @Column({ type: 'timestamp', nullable: true })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  // Duration
  @Column({ type: 'int', default: 0 })
  duration_minutes: number;

  // Attendance percentage (duration / session duration * 100)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendance_percentage: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: AttendanceStatus,
    default: AttendanceStatus.ABSENT,
  })
  status: AttendanceStatus;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CourseSession, { eager: false })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `session_id` | UUID | Yes | Session reference |
| `user_id` | UUID | Yes | Student reference |
| `joined_at` | Timestamp | No | When student joined |
| `left_at` | Timestamp | No | When student left |
| `duration_minutes` | Integer | Yes | Total attendance duration |
| `attendance_percentage` | Decimal(5,2) | Yes | % of session attended |
| `status` | Enum | Yes | Attendance status |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. One record per student per session (unique constraint)
2. `duration_minutes` = difference between joined_at and left_at
3. `attendance_percentage` = (duration_minutes / session.duration_minutes) * 100
4. Status is 'present' if attendance_percentage >= 20%
5. Status is 'late' if joined > 10 minutes after start
6. Status is 'absent' if never joined

---

## 🔄 Business Logic Flows

### Flow 1: Track Attendance (LiveKit Webhook)

**Webhook Endpoint**: `POST /api/webhooks/livekit`

**Authorization**: LiveKit webhook signature verification

**Event Types**:
- `participant_joined`
- `participant_left`
- `room_finished`

#### Event 1: participant_joined

**Webhook Payload**:
```json
{
  "event": "participant_joined",
  "room": {
    "name": "course_550e8400_session_1",
    "sid": "RM_abc123"
  },
  "participant": {
    "identity": "890e8400-e29b-41d4-a716-446655440003",
    "sid": "PA_xyz789",
    "name": "student_user",
    "joined_at": 1732614300
  },
  "created_at": 1732614300
}
```

**Process Steps**:

1. **Verify Webhook Signature**:
   ```typescript
   const signature = req.headers['livekit-signature'];
   const isValid = await livekitService.verifyWebhookSignature(
     req.body,
     signature
   );
   
   if (!isValid) {
     throw new UnauthorizedException('Invalid webhook signature');
   }
   ```

2. **Parse Room Name**:
   ```typescript
   const roomName = event.room.name; // "course_550e8400_session_1"
   const parts = roomName.split('_');
   
   if (parts[0] !== 'course' || parts.length !== 4) {
     // Not a course session room, ignore
     return { message: 'Not a course session' };
   }
   
   const courseId = parts[1];
   const sessionNumber = parseInt(parts[3]);
   ```

3. **Find Session**:
   ```typescript
   const session = await sessionRepository.findOne({
     where: {
       course_id: courseId,
       session_number: sessionNumber,
     },
   });
   
   if (!session) {
     throw new NotFoundException('Session not found');
   }
   ```

4. **Extract User ID**:
   ```typescript
   const userId = event.participant.identity;
   ```

5. **Create or Update Attendance Record**:
   ```typescript
   let attendance = await attendanceRepository.findOne({
     where: {
       session_id: session.id,
       user_id: userId,
     },
   });
   
   if (!attendance) {
     attendance = attendanceRepository.create({
       session_id: session.id,
       user_id: userId,
       joined_at: new Date(event.participant.joined_at * 1000),
       status: AttendanceStatus.PRESENT,
     });
   } else {
     // Update if rejoining
     attendance.joined_at = new Date(event.participant.joined_at * 1000);
     attendance.status = AttendanceStatus.PRESENT;
   }
   
   await attendanceRepository.save(attendance);
   ```

6. **Log Event**:
   ```typescript
   logger.log(`Student ${userId} joined session ${session.id}`);
   ```

**Success Response** (200 OK):
```json
{
  "message": "Attendance recorded",
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "890e8400-e29b-41d4-a716-446655440003",
  "joined_at": "2025-12-01T14:05:00.000Z"
}
```

---

#### Event 2: participant_left

**Webhook Payload**:
```json
{
  "event": "participant_left",
  "room": {
    "name": "course_550e8400_session_1",
    "sid": "RM_abc123"
  },
  "participant": {
    "identity": "890e8400-e29b-41d4-a716-446655440003",
    "sid": "PA_xyz789",
    "name": "student_user"
  },
  "created_at": 1732619700
}
```

**Process Steps**:

1. **Verify Signature** (same as above)

2. **Parse Room Name** (same as above)

3. **Find Session** (same as above)

4. **Find Attendance Record**:
   ```typescript
   const attendance = await attendanceRepository.findOne({
     where: {
       session_id: session.id,
       user_id: event.participant.identity,
     },
     relations: ['session'],
   });
   
   if (!attendance) {
     logger.warn(`No attendance record found for user ${event.participant.identity}`);
     return { message: 'No attendance record found' };
   }
   ```

5. **Calculate Duration**:
   ```typescript
   const leftAt = new Date(event.created_at * 1000);
   const joinedAt = attendance.joined_at;
   
   const durationMs = leftAt.getTime() - joinedAt.getTime();
   const durationMinutes = Math.floor(durationMs / 60000);
   ```

6. **Calculate Attendance Percentage**:
   ```typescript
   const sessionDuration = attendance.session.duration_minutes;
   const attendancePercentage = (durationMinutes / sessionDuration) * 100;
   ```

7. **Update Attendance Record**:
   ```typescript
   attendance.left_at = leftAt;
   attendance.duration_minutes = durationMinutes;
   attendance.attendance_percentage = Math.min(100, attendancePercentage);
   
   // Update status based on percentage
   if (attendancePercentage >= 20) {
     attendance.status = AttendanceStatus.PRESENT;
   } else {
     attendance.status = AttendanceStatus.ABSENT;
   }
   
   await attendanceRepository.save(attendance);
   ```

8. **Update Session Purchase (if exists)**:
   ```typescript
   const purchase = await purchaseRepository.findOne({
     where: {
       session_id: session.id,
       user_id: event.participant.identity,
     },
   });
   
   if (purchase) {
     purchase.attendance_duration_minutes = durationMinutes;
     await purchaseRepository.save(purchase);
   }
   ```

**Success Response** (200 OK):
```json
{
  "message": "Attendance updated",
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "890e8400-e29b-41d4-a716-446655440003",
  "duration_minutes": 90,
  "attendance_percentage": 75.00,
  "status": "present"
}
```

---

#### Event 3: room_finished

**Webhook Payload**:
```json
{
  "event": "room_finished",
  "room": {
    "name": "course_550e8400_session_1",
    "sid": "RM_abc123",
    "created_at": 1732614000,
    "finished_at": 1732621200
  },
  "created_at": 1732621200
}
```

**Process Steps**:

1. **Verify Signature** (same as above)

2. **Parse Room Name** (same as above)

3. **Find Session** (same as above)

4. **Update Session Status**:
   ```typescript
   session.status = SessionStatus.COMPLETED;
   await sessionRepository.save(session);
   ```

5. **Trigger Payment Release**:
   ```typescript
   // This will be handled by the cron job (Flow 2)
   logger.log(`Session ${session.id} completed. Payment release will be processed by cron job.`);
   ```

**Success Response** (200 OK):
```json
{
  "message": "Session marked as completed",
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "completed"
}
```

---

### Flow 2: Auto-Release Payments (Cron Job)

**Schedule**: Every 5 minutes

**Cron Expression**: `*/5 * * * *`

**Implementation**:

```typescript
@Injectable()
export class PaymentReleaseService {
  constructor(
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private purchaseRepository: Repository<SessionPurchase>,
    @InjectRepository(PaymentHold)
    private holdRepository: Repository<PaymentHold>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    private dataSource: DataSource,
  ) {}

  @Cron('*/5 * * * *')
  async autoReleasePayments() {
    const logger = new Logger('PaymentReleaseCron');
    logger.log('Starting payment release job...');

    // Find completed sessions in last 24 hours
    const completedSessions = await this.findCompletedSessions();
    logger.log(`Found ${completedSessions.length} completed sessions`);

    for (const session of completedSessions) {
      await this.processSessionPayments(session);
    }

    logger.log('Payment release job completed');
  }

  private async findCompletedSessions(): Promise<CourseSession[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.sessionRepository.find({
      where: {
        status: SessionStatus.COMPLETED,
        updated_at: MoreThan(oneDayAgo),
      },
      relations: ['course', 'course.teacher'],
    });
  }

  private async processSessionPayments(session: CourseSession) {
    const logger = new Logger('ProcessSessionPayments');
    logger.log(`Processing payments for session ${session.id}`);

    // Find all purchases for this session
    const purchases = await this.purchaseRepository.find({
      where: {
        session_id: session.id,
        status: PurchaseStatus.ACTIVE,
      },
      relations: ['user'],
    });

    logger.log(`Found ${purchases.length} purchases to process`);

    for (const purchase of purchases) {
      await this.processPurchasePayment(purchase, session);
    }
  }

  private async processPurchasePayment(
    purchase: SessionPurchase,
    session: CourseSession,
  ) {
    const logger = new Logger('ProcessPurchasePayment');

    // Get attendance record
    const attendance = await this.attendanceRepository.findOne({
      where: {
        session_id: session.id,
        user_id: purchase.user_id,
      },
    });

    const attendancePercent = attendance?.attendance_percentage || 0;
    logger.log(
      `Purchase ${purchase.id}: Attendance ${attendancePercent}%`
    );

    // Find payment hold
    const hold = await this.holdRepository.findOne({
      where: {
        session_purchase_id: purchase.id,
        status: HoldStatus.HELD,
      },
    });

    if (!hold) {
      logger.warn(`No payment hold found for purchase ${purchase.id}`);
      return;
    }

    // Decide: Release or Refund
    if (attendancePercent >= 20) {
      await this.releasePaymentToTeacher(hold, session, attendancePercent);
      await this.updatePurchaseStatus(purchase, PurchaseStatus.ATTENDED, attendancePercent);
    } else {
      await this.refundPaymentToStudent(hold, session);
      await this.updatePurchaseStatus(purchase, PurchaseStatus.MISSED, attendancePercent);
    }
  }
}
```

---

### Flow 3: Release Payment to Teacher

**Function**: `releasePaymentToTeacher(hold, session, attendancePercent)`

**Process Steps**:

1. **Get Teacher and Commission Rate**:
   ```typescript
   const teacher = await userRepository.findOne({
     where: { id: hold.teacher_id },
     relations: ['referredBy'],
   });
   
   // If teacher was referred by another teacher: 30% commission
   // Otherwise: 0% commission
   const commissionRate = teacher.referredBy ? 0.30 : 0.00;
   ```

2. **Calculate Amounts**:
   ```typescript
   const totalAmount = hold.amount;
   const platformFee = totalAmount * commissionRate;
   const teacherAmount = totalAmount - platformFee;
   ```

3. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // All steps in transaction
   });
   ```

4. **Update Teacher Balance**:
   ```typescript
   const teacherBefore = teacher.credit_balance || 0;
   const teacherAfter = teacherBefore + teacherAmount;
   
   await manager.update(User, hold.teacher_id, {
     credit_balance: () => `credit_balance + ${teacherAmount}`,
   });
   ```

5. **Create Teacher Transaction**:
   ```typescript
   await manager.save(Transaction, {
     user_id: hold.teacher_id,
     type: TransactionType.PAYMENT_RELEASE,
     amount: teacherAmount,
     balance_before: teacherBefore,
     balance_after: teacherAfter,
     status: TransactionStatus.COMPLETED,
     reference_type: 'payment_hold',
     reference_id: hold.id,
     description: `Payment released for session (${attendancePercent.toFixed(1)}% attendance)`,
     metadata: {
       session_id: session.id,
       course_id: session.course_id,
       original_amount: totalAmount,
       commission_rate: commissionRate,
       platform_fee: platformFee,
       attendance_percentage: attendancePercent,
     },
     completed_at: new Date(),
   });
   ```

6. **Create Platform Commission Transaction** (if applicable):
   ```typescript
   if (platformFee > 0) {
     await manager.save(Transaction, {
       user_id: 'platform', // Special platform user
       type: TransactionType.COMMISSION,
       amount: platformFee,
       balance_before: 0,
       balance_after: platformFee,
       status: TransactionStatus.COMPLETED,
       reference_type: 'payment_hold',
       reference_id: hold.id,
       description: `Platform commission (${(commissionRate * 100).toFixed(0)}%)`,
       metadata: {
         teacher_id: hold.teacher_id,
         session_id: session.id,
         commission_rate: commissionRate,
       },
       completed_at: new Date(),
     });
   }
   ```

7. **Update Payment Hold**:
   ```typescript
   await manager.update(PaymentHold, hold.id, {
     status: HoldStatus.RELEASED,
     released_at: new Date(),
     release_percentage: attendancePercent,
     notes: `Released to teacher (${attendancePercent.toFixed(1)}% attendance)`,
   });
   ```

8. **Send Notification to Teacher**:
   ```typescript
   await notificationService.send({
     user_id: hold.teacher_id,
     type: 'payment_released',
     title: 'Payment Released',
     message: `You received $${teacherAmount.toFixed(2)} for completed session`,
     metadata: {
       session_id: session.id,
       amount: teacherAmount,
     },
   });
   ```

**Log Output**:
```
✅ Payment released to teacher
   Session: 660e8400-e29b-41d4-a716-446655440001
   Teacher: john_teacher
   Total Amount: $12.00
   Platform Fee: $3.60 (30%)
   Teacher Receives: $8.40
   Attendance: 75.0%
```

---

### Flow 4: Refund Payment to Student

**Function**: `refundPaymentToStudent(hold, session)`

**Process Steps**:

1. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // All steps in transaction
   });
   ```

2. **Update Student Balance**:
   ```typescript
   const student = await manager.findOne(User, {
     where: { id: hold.student_id },
   });
   
   const balanceBefore = student.credit_balance || 0;
   const balanceAfter = balanceBefore + hold.amount;
   
   await manager.update(User, hold.student_id, {
     credit_balance: () => `credit_balance + ${hold.amount}`,
   });
   ```

3. **Create Student Transaction**:
   ```typescript
   await manager.save(Transaction, {
     user_id: hold.student_id,
     type: TransactionType.REFUND,
     amount: hold.amount,
     balance_before: balanceBefore,
     balance_after: balanceAfter,
     status: TransactionStatus.COMPLETED,
     reference_type: 'payment_hold',
     reference_id: hold.id,
     description: 'Refund due to low attendance (<20%)',
     metadata: {
       session_id: session.id,
       course_id: session.course_id,
       reason: 'low_attendance',
     },
     completed_at: new Date(),
   });
   ```

4. **Update Payment Hold**:
   ```typescript
   await manager.update(PaymentHold, hold.id, {
     status: HoldStatus.REFUNDED,
     released_at: new Date(),
     notes: 'Refunded due to attendance < 20%',
   });
   ```

5. **Update Session Purchase**:
   ```typescript
   await manager.update(SessionPurchase, {
     session_purchase_id: hold.session_purchase_id,
   }, {
     refund_amount: hold.amount,
     status: PurchaseStatus.MISSED,
   });
   ```

6. **Send Notification to Student**:
   ```typescript
   await notificationService.send({
     user_id: hold.student_id,
     type: 'refund_issued',
     title: 'Refund Issued',
     message: `You received $${hold.amount.toFixed(2)} refund due to low attendance`,
     metadata: {
       session_id: session.id,
       amount: hold.amount,
     },
   });
   ```

**Log Output**:
```
💰 Payment refunded to student
   Session: 660e8400-e29b-41d4-a716-446655440001
   Student: student_user
   Amount: $12.00
   Reason: Attendance < 20%
```

---

### Flow 5: Request Withdrawal

**Endpoint**: `POST /api/withdrawals`

**Authorization**: Teacher only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "amount": 500.00,
  "bank_account_info": {
    "bank_name": "ABC Bank",
    "account_number": "1234567890",
    "account_name": "John Teacher",
    "branch": "Main Branch",
    "swift_code": "ABCVNVX"
  },
  "notes": "Monthly withdrawal"
}
```

**Validation Rules**:
- `amount`: Required, must be >= 10.00
- `bank_account_info`: Required, must contain bank_name, account_number, account_name
- `notes`: Optional, max 500 characters

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   
   if (user.role !== 'teacher') {
     throw new ForbiddenException('Only teachers can request withdrawals');
   }
   ```

2. **Check Teacher Verification**:
   ```typescript
   const teacherProfile = await teacherProfileRepository.findOne({
     where: { user_id: user.id },
   });
   
   if (!teacherProfile || !teacherProfile.is_verified) {
     throw new BadRequestException('Teacher must be verified to withdraw');
   }
   ```

3. **Validate Amount**:
   ```typescript
   const MIN_WITHDRAWAL = 10.00;
   
   if (dto.amount < MIN_WITHDRAWAL) {
     throw new BadRequestException(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}`);
   }
   ```

4. **Check Available Balance**:
   ```typescript
   const availableBalance = user.credit_balance || 0;
   
   if (availableBalance < dto.amount) {
     throw new BadRequestException(
       `Insufficient balance. Available: $${availableBalance}, Requested: $${dto.amount}`
     );
   }
   ```

5. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

6. **Deduct from Balance**:
   ```typescript
   const balanceBefore = user.credit_balance;
   const balanceAfter = balanceBefore - dto.amount;
   
   await manager.update(User, user.id, {
     credit_balance: () => `credit_balance - ${dto.amount}`,
   });
   ```

7. **Create Withdrawal Request**:
   ```typescript
   const withdrawal = await manager.save(Withdrawal, {
     teacher_id: user.id,
     amount: dto.amount,
     status: WithdrawalStatus.PENDING,
     bank_account_info: dto.bank_account_info,
     requested_at: new Date(),
     notes: dto.notes,
   });
   ```

8. **Create Transaction Record**:
   ```typescript
   await manager.save(Transaction, {
     user_id: user.id,
     type: TransactionType.WITHDRAWAL,
     amount: -dto.amount, // Negative for debit
     balance_before: balanceBefore,
     balance_after: balanceAfter,
     status: TransactionStatus.PENDING,
     reference_type: 'withdrawal',
     reference_id: withdrawal.id,
     description: 'Withdrawal request',
     metadata: {
       bank_name: dto.bank_account_info.bank_name,
       account_number: dto.bank_account_info.account_number.slice(-4), // Last 4 digits only
     },
   });
   ```

9. **Notify Admin**:
   ```typescript
   await notificationService.notifyAdmins({
     type: 'withdrawal_requested',
     title: 'New Withdrawal Request',
     message: `${user.username} requested withdrawal of $${dto.amount}`,
     metadata: {
       withdrawal_id: withdrawal.id,
       teacher_id: user.id,
       amount: dto.amount,
     },
   });
   ```

10. **Return Response**:
    ```typescript
    return {
      id: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      requested_at: withdrawal.requested_at,
      bank_account_info: {
        bank_name: withdrawal.bank_account_info.bank_name,
        account_number: '****' + withdrawal.bank_account_info.account_number.slice(-4),
      },
    };
    ```

**Success Response** (201 Created):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "amount": 500.00,
  "status": "pending",
  "requested_at": "2025-11-26T11:00:00.000Z",
  "bank_account_info": {
    "bank_name": "ABC Bank",
    "account_number": "****7890"
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | User is not a teacher |
| 400 | Bad Request | Not verified, amount too low, or insufficient balance |
| 500 | Internal Server Error | Database or transaction error |

---

### Flow 6: Admin Approve Withdrawal

**Endpoint**: `PATCH /api/admin/withdrawals/:id/approve`

**Authorization**: Admin only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `id`: UUID of the withdrawal request

**Request Body**:
```json
{
  "admin_notes": "Processed via bank transfer on 2025-11-26"
}
```

**Process Steps**:

1. **Authenticate Admin**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   
   if (user.role !== 'admin') {
     throw new ForbiddenException('Admin access required');
   }
   ```

2. **Find Withdrawal**:
   ```typescript
   const withdrawal = await withdrawalRepository.findOne({
     where: { id: withdrawalId },
     relations: ['teacher'],
   });
   
   if (!withdrawal) {
     throw new NotFoundException('Withdrawal not found');
   }
   ```

3. **Validate Status**:
   ```typescript
   if (withdrawal.status !== WithdrawalStatus.PENDING) {
     throw new BadRequestException('Withdrawal has already been processed');
   }
   ```

4. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

5. **Update Withdrawal Status**:
   ```typescript
   await manager.update(Withdrawal, withdrawalId, {
     status: WithdrawalStatus.COMPLETED,
     processed_at: new Date(),
     completed_at: new Date(),
     admin_notes: dto.admin_notes,
   });
   ```

6. **Update Transaction Status**:
   ```typescript
   await manager.update(
     Transaction,
     {
       reference_type: 'withdrawal',
       reference_id: withdrawalId,
     },
     {
       status: TransactionStatus.COMPLETED,
       completed_at: new Date(),
     }
   );
   ```

7. **Notify Teacher**:
   ```typescript
   await notificationService.send({
     user_id: withdrawal.teacher_id,
     type: 'withdrawal_completed',
     title: 'Withdrawal Completed',
     message: `Your withdrawal of $${withdrawal.amount} has been processed`,
     metadata: {
       withdrawal_id: withdrawal.id,
       amount: withdrawal.amount,
     },
   });
   ```

8. **Return Updated Withdrawal**:
   ```typescript
   return {
     id: withdrawal.id,
     amount: withdrawal.amount,
     status: WithdrawalStatus.COMPLETED,
     requested_at: withdrawal.requested_at,
     completed_at: new Date(),
     admin_notes: dto.admin_notes,
   };
   ```

**Success Response** (200 OK):
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "amount": 500.00,
  "status": "completed",
  "requested_at": "2025-11-26T11:00:00.000Z",
  "completed_at": "2025-11-26T15:00:00.000Z",
  "admin_notes": "Processed via bank transfer on 2025-11-26"
}
```

---

### Flow 7: Get Teacher Revenue Dashboard

**Endpoint**: `GET /api/teachers/me/revenue`

**Authorization**: Teacher only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Process Steps**:

1. **Authenticate Teacher**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   
   if (user.role !== 'teacher') {
     throw new ForbiddenException('Teacher access required');
   }
   ```

2. **Get Total Earnings**:
   ```typescript
   const totalEarnings = await transactionRepository
     .createQueryBuilder('t')
     .select('SUM(t.amount)', 'total')
     .where('t.user_id = :userId', { userId: user.id })
     .andWhere('t.type = :type', { type: TransactionType.PAYMENT_RELEASE })
     .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
     .getRawOne();
   ```

3. **Get Available Balance**:
   ```typescript
   const availableBalance = user.credit_balance || 0;
   ```

4. **Get Pending Payments** (held):
   ```typescript
   const pendingPayments = await holdRepository
     .createQueryBuilder('h')
     .select('SUM(h.amount)', 'total')
     .where('h.teacher_id = :teacherId', { teacherId: user.id })
     .andWhere('h.status = :status', { status: HoldStatus.HELD })
     .getRawOne();
   ```

5. **Get Total Withdrawn**:
   ```typescript
   const totalWithdrawn = await withdrawalRepository
     .createQueryBuilder('w')
     .select('SUM(w.amount)', 'total')
     .where('w.teacher_id = :teacherId', { teacherId: user.id })
     .andWhere('w.status = :status', { status: WithdrawalStatus.COMPLETED })
     .getRawOne();
   ```

6. **Get Withdrawal History**:
   ```typescript
   const withdrawals = await withdrawalRepository.find({
     where: { teacher_id: user.id },
     order: { requested_at: 'DESC' },
     take: 10,
   });
   ```

7. **Get Recent Transactions**:
   ```typescript
   const transactions = await transactionRepository.find({
     where: { user_id: user.id },
     order: { created_at: 'DESC' },
     take: 20,
   });
   ```

8. **Format Response**:
   ```typescript
   return {
     total_earnings: parseFloat(totalEarnings.total) || 0,
     available_balance: availableBalance,
     pending_payments: parseFloat(pendingPayments.total) || 0,
     total_withdrawn: parseFloat(totalWithdrawn.total) || 0,
     withdrawals: withdrawals.map(w => ({
       id: w.id,
       amount: w.amount,
       status: w.status,
       requested_at: w.requested_at,
       completed_at: w.completed_at,
     })),
     recent_transactions: transactions.map(t => ({
       id: t.id,
       type: t.type,
       amount: t.amount,
       description: t.description,
       status: t.status,
       created_at: t.created_at,
     })),
   };
   ```

**Success Response** (200 OK):
```json
{
  "total_earnings": 5000.00,
  "available_balance": 1200.00,
  "pending_payments": 800.00,
  "total_withdrawn": 3000.00,
  "withdrawals": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440005",
      "amount": 500.00,
      "status": "completed",
      "requested_at": "2025-11-26T11:00:00.000Z",
      "completed_at": "2025-11-26T15:00:00.000Z"
    }
  ],
  "recent_transactions": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440006",
      "type": "payment_release",
      "amount": 100.00,
      "description": "Payment released for session (75.0% attendance)",
      "status": "completed",
      "created_at": "2025-11-26T10:00:00.000Z"
    }
  ]
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/webhooks/livekit` | LiveKit webhook handler | ❌ | Webhook |
| POST | `/api/withdrawals` | Request withdrawal | ✅ | Teacher |
| GET | `/api/withdrawals/me` | My withdrawal requests | ✅ | Teacher |
| GET | `/api/teachers/me/revenue` | Revenue dashboard | ✅ | Teacher |
| GET | `/api/transactions/me` | My transactions | ✅ | Any |
| PATCH | `/api/admin/withdrawals/:id/approve` | Approve withdrawal | ✅ | Admin |
| PATCH | `/api/admin/withdrawals/:id/reject` | Reject withdrawal | ✅ | Admin |
| GET | `/api/admin/withdrawals` | All withdrawal requests | ✅ | Admin |

---

## 🧪 Testing Guide

### Test Scenario 1: Complete Session Flow

```bash
# 1. Student purchases session
POST http://localhost:3000/api/enrollments/sessions/{sessionId}/purchase

# 2. Simulate LiveKit events (use webhook testing tool)
POST http://localhost:3000/api/webhooks/livekit
Body: {
  "event": "participant_joined",
  "room": { "name": "course_xxx_session_1" },
  "participant": { "identity": "student_id", "joined_at": 1732614300 }
}

# 3. Simulate participant left
POST http://localhost:3000/api/webhooks/livekit
Body: {
  "event": "participant_left",
  "room": { "name": "course_xxx_session_1" },
  "participant": { "identity": "student_id" },
  "created_at": 1732619700
}

# 4. Simulate room finished
POST http://localhost:3000/api/webhooks/livekit
Body: {
  "event": "room_finished",
  "room": { "name": "course_xxx_session_1" }
}

# 5. Wait for cron job or manually trigger
# Check payment hold status
GET http://localhost:3000/api/admin/payment-holds/{holdId}
# Expected: status = 'released' (if attendance >= 20%)

# 6. Check teacher balance
GET http://localhost:3000/api/teachers/me/revenue
# Expected: available_balance increased
```

---

## 🎯 Success Criteria

Phase 3 is complete when:

- ✅ LiveKit webhooks track attendance
- ✅ Attendance records are created/updated
- ✅ Cron job runs every 5 minutes
- ✅ Payments auto-release (>= 20% attendance)
- ✅ Payments auto-refund (< 20% attendance)
- ✅ Commission calculated correctly
- ✅ Teachers can request withdrawals
- ✅ Admins can approve/reject withdrawals
- ✅ Revenue dashboard shows correct data
- ✅ All transactions are recorded
- ✅ All error cases are handled

---

**End of Phase 3 Documentation**
