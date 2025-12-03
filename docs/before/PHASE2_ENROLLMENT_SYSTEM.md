# 📚 Phase 2: Student Enrollment & Payment Hold System

**Version**: 1.0  
**Status**: ✅ **COMPLETE**  
**Priority**: Critical  
**Estimated Time**: 3-4 days  
**Dependencies**: Phase 1 (Course Management)

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Entity Definitions](#entity-definitions)
4. [Business Logic Flows](#business-logic-flows)
5. [API Endpoints](#api-endpoints)
6. [Transaction Management](#transaction-management)
7. [Validation Rules](#validation-rules)
8. [Error Handling](#error-handling)
9. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Enable students to enroll in courses and purchase individual sessions. All payments are held in escrow until session completion (Phase 3 handles release).

### Key Features

- ✅ Students can enroll in full courses
- ✅ Students can purchase individual sessions
- ✅ Credit-based payment system
- ✅ Payment hold (escrow) mechanism
- ✅ Refund system (cancel before session)
- ✅ Access control (who can join sessions)
- ✅ Enrollment tracking
- ✅ Purchase history

### User Roles

- **Student**: Can enroll in courses and purchase sessions
- **Teacher**: Receives payments after session completion
- **Admin**: Can view all enrollments and manage refunds

### Payment Flow

```
Student Enrolls/Purchases
         ↓
Credit Deducted from Student
         ↓
Payment Held in Escrow
         ↓
Session Happens (Phase 3)
         ↓
Payment Released to Teacher OR Refunded to Student
```

---

## 🗄️ Database Schema

### Tables Overview

```
course_enrollments
├── id (PK)
├── user_id (FK → users.id)
├── course_id (FK → courses.id)
├── enrollment_type
├── total_price_paid
├── payment_status
├── status
├── enrolled_at
├── cancelled_at
├── refund_amount
├── completion_percentage
├── created_at
└── updated_at

session_purchases
├── id (PK)
├── user_id (FK → users.id)
├── course_id (FK → courses.id)
├── session_id (FK → course_sessions.id)
├── price_paid
├── payment_status
├── status
├── purchased_at
├── cancelled_at
├── refund_amount
├── attended
├── attendance_duration_minutes
├── created_at
└── updated_at

payment_holds
├── id (PK)
├── enrollment_id (FK → course_enrollments.id, nullable)
├── session_purchase_id (FK → session_purchases.id, nullable)
├── teacher_id (FK → users.id)
├── student_id (FK → users.id)
├── amount
├── status
├── held_at
├── released_at
├── release_percentage
├── notes
└── created_at
```

### Entity Relationships

```
User (Student)
  ├── has many CourseEnrollments
  ├── has many SessionPurchases
  └── has many PaymentHolds (as student)

User (Teacher)
  └── has many PaymentHolds (as teacher)

Course
  ├── has many CourseEnrollments
  └── has many SessionPurchases

CourseSession
  └── has many SessionPurchases

CourseEnrollment
  └── has many PaymentHolds

SessionPurchase
  └── has many PaymentHolds
```

---

## 🔧 Entity Definitions

### 1. CourseEnrollment Entity

**File**: `src/features/courses/entities/enrollment.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Course } from './course.entity';
import { PaymentHold } from './payment-hold.entity';

export enum EnrollmentType {
  FULL_COURSE = 'full_course',
  PER_SESSION = 'per_session',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('course_enrollments')
@Index(['user_id'])
@Index(['course_id'])
@Index(['status'])
@Index(['user_id', 'course_id'], { unique: true })
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Student who enrolled
  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  // Course enrolled in
  @Column({ type: 'varchar', length: 36 })
  course_id: string;

  // Enrollment Type
  @Column({
    type: 'varchar',
    length: 20,
    enum: EnrollmentType,
  })
  enrollment_type: EnrollmentType;

  // Payment Information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price_paid: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  // Enrollment Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  // Progress Tracking
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completion_percentage: number;

  // Dates
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  enrolled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  // Refund Information
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refund_amount: number;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { eager: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => PaymentHold, (hold) => hold.enrollment)
  paymentHolds: PaymentHold[];
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | Student who enrolled |
| `course_id` | UUID | Yes | Course enrolled in |
| `enrollment_type` | Enum | Yes | Type of enrollment (full_course or per_session) |
| `total_price_paid` | Decimal(10,2) | Yes | Total amount paid |
| `payment_status` | Enum | Yes | Payment status (pending/paid/refunded) |
| `status` | Enum | Yes | Enrollment status (active/cancelled/completed) |
| `completion_percentage` | Decimal(5,2) | Yes | Course completion % (0-100) |
| `enrolled_at` | Timestamp | Yes | When student enrolled |
| `cancelled_at` | Timestamp | No | When enrollment was cancelled |
| `refund_amount` | Decimal(10,2) | Yes | Amount refunded (if cancelled) |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. One student can only enroll in a course once (unique constraint on user_id + course_id)
2. `total_price_paid` must equal `course.price_full_course` at time of enrollment
3. `payment_status` is set to 'paid' immediately upon successful enrollment
4. `status` starts as 'active' and can transition to 'cancelled' or 'completed'
5. `completion_percentage` is calculated based on attended sessions
6. Cannot cancel if any sessions have been attended
7. Refund amount equals total_price_paid if cancelled before any sessions

---

### 2. SessionPurchase Entity

**File**: `src/features/courses/entities/session-purchase.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Course } from './course.entity';
import { CourseSession } from './course-session.entity';
import { PaymentHold } from './payment-hold.entity';

export enum PurchaseStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  ATTENDED = 'attended',
  MISSED = 'missed',
}

@Entity('session_purchases')
@Index(['user_id'])
@Index(['session_id'])
@Index(['status'])
@Index(['user_id', 'session_id'], { unique: true })
export class SessionPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Student who purchased
  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  // Course reference
  @Column({ type: 'varchar', length: 36 })
  course_id: string;

  // Session purchased
  @Column({ type: 'varchar', length: 36 })
  session_id: string;

  // Payment Information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_paid: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  payment_status: string;

  // Purchase Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: PurchaseStatus,
    default: PurchaseStatus.ACTIVE,
  })
  status: PurchaseStatus;

  // Attendance Tracking
  @Column({ type: 'boolean', default: false })
  attended: boolean;

  @Column({ type: 'int', default: 0 })
  attendance_duration_minutes: number;

  // Dates
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchased_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  // Refund Information
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refund_amount: number;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { eager: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => CourseSession, { eager: false })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @OneToMany(() => PaymentHold, (hold) => hold.sessionPurchase)
  paymentHolds: PaymentHold[];
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `user_id` | UUID | Yes | Student who purchased |
| `course_id` | UUID | Yes | Parent course reference |
| `session_id` | UUID | Yes | Session purchased |
| `price_paid` | Decimal(10,2) | Yes | Amount paid for session |
| `payment_status` | String(50) | Yes | Payment status |
| `status` | Enum | Yes | Purchase status (active/cancelled/attended/missed) |
| `attended` | Boolean | Yes | Whether student attended session |
| `attendance_duration_minutes` | Integer | Yes | How long student attended (minutes) |
| `purchased_at` | Timestamp | Yes | When session was purchased |
| `cancelled_at` | Timestamp | No | When purchase was cancelled |
| `refund_amount` | Decimal(10,2) | Yes | Amount refunded (if cancelled) |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. One student can only purchase a session once (unique constraint on user_id + session_id)
2. `price_paid` must equal `course.price_per_session` at time of purchase
3. Cannot purchase if already enrolled in full course
4. Cannot purchase if session is in the past
5. Cannot cancel if `attended = true`
6. Status transitions: active → attended/missed (Phase 3) or active → cancelled (refund)
7. `attendance_duration_minutes` is tracked via LiveKit webhooks (Phase 3)

---

### 3. PaymentHold Entity

**File**: `src/features/courses/entities/payment-hold.entity.ts`

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
import { CourseEnrollment } from './enrollment.entity';
import { SessionPurchase } from './session-purchase.entity';

export enum HoldStatus {
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
}

@Entity('payment_holds')
@Index(['teacher_id'])
@Index(['student_id'])
@Index(['status'])
export class PaymentHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to enrollment OR session purchase (one will be set)
  @Column({ type: 'varchar', length: 36, nullable: true })
  enrollment_id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  session_purchase_id: string;

  // Parties involved
  @Column({ type: 'varchar', length: 36 })
  teacher_id: string;

  @Column({ type: 'varchar', length: 36 })
  student_id: string;

  // Amount held
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Hold Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: HoldStatus,
    default: HoldStatus.HELD,
  })
  status: HoldStatus;

  // Release Information (Phase 3)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  release_percentage: number;

  // Dates
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  held_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  released_at: Date;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => CourseEnrollment, { eager: false, nullable: true })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: CourseEnrollment;

  @ManyToOne(() => SessionPurchase, { eager: false, nullable: true })
  @JoinColumn({ name: 'session_purchase_id' })
  sessionPurchase: SessionPurchase;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `enrollment_id` | UUID | No | Reference to course enrollment (if full course) |
| `session_purchase_id` | UUID | No | Reference to session purchase (if per session) |
| `teacher_id` | UUID | Yes | Teacher who will receive payment |
| `student_id` | UUID | Yes | Student who made payment |
| `amount` | Decimal(10,2) | Yes | Amount held in escrow |
| `status` | Enum | Yes | Hold status (held/released/refunded) |
| `release_percentage` | Decimal(5,2) | Yes | % of amount to release (Phase 3) |
| `held_at` | Timestamp | Yes | When payment was held |
| `released_at` | Timestamp | No | When payment was released/refunded |
| `notes` | Text | No | Additional notes |
| `created_at` | Timestamp | Yes | Creation timestamp |

**Business Rules**:

1. Either `enrollment_id` OR `session_purchase_id` must be set (not both)
2. `amount` must match the enrollment/purchase amount
3. `status` starts as 'held' and transitions to 'released' or 'refunded'
4. Payment is held until session completion (Phase 3)
5. If attendance >= 20%, status → 'released' and money goes to teacher
6. If attendance < 20%, status → 'refunded' and money goes back to student
7. `release_percentage` tracks attendance % for audit purposes

---

## 🔄 Business Logic Flows

### Flow 1: Enroll in Full Course

**Endpoint**: `POST /api/enrollments/courses/:courseId`

**Authorization**: Student only (authenticated user)

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `courseId`: UUID of the course to enroll in

**Request Body**:
```json
{
  "enrollment_type": "full_course"
}
```

**Validation Rules**:
- `enrollment_type`: Required, must be "full_course"

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   if (!user) {
     throw new UnauthorizedException('Authentication required');
   }
   ```

2. **Validate Course Exists and is Published**:
   ```typescript
   const course = await courseRepository.findOne({
     where: { id: courseId },
     relations: ['teacher'],
   });
   
   if (!course) {
     throw new NotFoundException('Course not found');
   }
   
   if (!course.is_published) {
     throw new BadRequestException('Course is not published');
   }
   ```

3. **Check Course Capacity**:
   ```typescript
   if (course.current_students >= course.max_students) {
     throw new BadRequestException('Course is full');
   }
   ```

4. **Check for Existing Enrollment**:
   ```typescript
   const existing = await enrollmentRepository.findOne({
     where: {
       user_id: user.id,
       course_id: courseId,
     },
   });
   
   if (existing) {
     throw new BadRequestException('You are already enrolled in this course');
   }
   ```

5. **Validate Pricing**:
   ```typescript
   const price = course.price_full_course;
   
   if (!price || price <= 0) {
     throw new BadRequestException('Course does not support full course enrollment');
   }
   ```

6. **Check User Credit Balance**:
   ```typescript
   const userBalance = user.credit_balance || 0;
   
   if (userBalance < price) {
     throw new BadRequestException(
       `Insufficient credit balance. Required: ${price}, Available: ${userBalance}`
     );
   }
   ```

7. **Start Database Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // All following steps happen in this transaction
   });
   ```

8. **Deduct Credit from Student**:
   ```typescript
   await manager.update(User, user.id, {
     credit_balance: () => `credit_balance - ${price}`,
   });
   ```

9. **Create Enrollment Record**:
   ```typescript
   const enrollment = await manager.save(CourseEnrollment, {
     user_id: user.id,
     course_id: courseId,
     enrollment_type: EnrollmentType.FULL_COURSE,
     total_price_paid: price,
     payment_status: PaymentStatus.PAID,
     status: EnrollmentStatus.ACTIVE,
     enrolled_at: new Date(),
     completion_percentage: 0,
   });
   ```

10. **Create Payment Hold**:
    ```typescript
    await manager.save(PaymentHold, {
      enrollment_id: enrollment.id,
      teacher_id: course.teacher_id,
      student_id: user.id,
      amount: price,
      status: HoldStatus.HELD,
      held_at: new Date(),
    });
    ```

11. **Increment Course Student Count**:
    ```typescript
    await manager.update(Course, courseId, {
      current_students: () => 'current_students + 1',
    });
    ```

12. **Load Full Enrollment with Relations**:
    ```typescript
    const fullEnrollment = await manager.findOne(CourseEnrollment, {
      where: { id: enrollment.id },
      relations: ['course', 'course.teacher'],
    });
    ```

13. **Return Success Response**:
    ```typescript
    return {
      id: fullEnrollment.id,
      user_id: fullEnrollment.user_id,
      course_id: fullEnrollment.course_id,
      enrollment_type: fullEnrollment.enrollment_type,
      total_price_paid: fullEnrollment.total_price_paid,
      payment_status: fullEnrollment.payment_status,
      status: fullEnrollment.status,
      enrolled_at: fullEnrollment.enrolled_at,
      completion_percentage: fullEnrollment.completion_percentage,
      course: {
        id: fullEnrollment.course.id,
        title: fullEnrollment.course.title,
        total_sessions: fullEnrollment.course.total_sessions,
        teacher: {
          id: fullEnrollment.course.teacher.id,
          username: fullEnrollment.course.teacher.username,
        },
      },
    };
    ```

**Success Response** (201 Created):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "user_id": "890e8400-e29b-41d4-a716-446655440003",
  "course_id": "550e8400-e29b-41d4-a716-446655440000",
  "enrollment_type": "full_course",
  "total_price_paid": 100.00,
  "payment_status": "paid",
  "status": "active",
  "enrolled_at": "2025-11-26T10:30:00.000Z",
  "completion_percentage": 0,
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "English Conversation for Beginners",
    "total_sessions": 10,
    "teacher": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "john_teacher"
    }
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Course not found |
| 400 | Bad Request | Course not published, full, already enrolled, insufficient credits, or invalid pricing |
| 500 | Internal Server Error | Database or transaction error |

**Transaction Rollback Scenarios**:

If any step fails, the entire transaction is rolled back:
- Credit is NOT deducted
- Enrollment is NOT created
- Payment hold is NOT created
- Course student count is NOT incremented

---

### Flow 2: Purchase Single Session

**Endpoint**: `POST /api/enrollments/sessions/:sessionId/purchase`

**Authorization**: Student only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `sessionId`: UUID of the session to purchase

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Validate Session Exists**:
   ```typescript
   const session = await sessionRepository.findOne({
     where: { id: sessionId },
     relations: ['course', 'course.teacher'],
   });
   
   if (!session) {
     throw new NotFoundException('Session not found');
   }
   
   const course = session.course;
   ```

3. **Check Session is in Future**:
   ```typescript
   const sessionDateTime = new Date(`${session.scheduled_date} ${session.start_time}`);
   
   if (sessionDateTime < new Date()) {
     throw new BadRequestException('Cannot purchase past sessions');
   }
   ```

4. **Check Session Status**:
   ```typescript
   if (session.status !== SessionStatus.SCHEDULED) {
     throw new BadRequestException('Session is not available for purchase');
   }
   ```

5. **Check for Existing Purchase**:
   ```typescript
   const existingPurchase = await purchaseRepository.findOne({
     where: {
       user_id: user.id,
       session_id: sessionId,
     },
   });
   
   if (existingPurchase) {
     throw new BadRequestException('You have already purchased this session');
   }
   ```

6. **Check for Full Course Enrollment**:
   ```typescript
   const enrollment = await enrollmentRepository.findOne({
     where: {
       user_id: user.id,
       course_id: course.id,
       status: EnrollmentStatus.ACTIVE,
     },
   });
   
   if (enrollment) {
     throw new BadRequestException(
       'You are already enrolled in the full course. No need to purchase individual sessions.'
     );
   }
   ```

7. **Validate Pricing**:
   ```typescript
   const price = course.price_per_session;
   
   if (!price || price <= 0) {
     throw new BadRequestException('Course does not support per-session purchase');
   }
   ```

8. **Check User Credit Balance**:
   ```typescript
   if (user.credit_balance < price) {
     throw new BadRequestException(
       `Insufficient credit balance. Required: ${price}, Available: ${user.credit_balance}`
     );
   }
   ```

9. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

10. **Deduct Credit**:
    ```typescript
    await manager.update(User, user.id, {
      credit_balance: () => `credit_balance - ${price}`,
    });
    ```

11. **Create Purchase Record**:
    ```typescript
    const purchase = await manager.save(SessionPurchase, {
      user_id: user.id,
      course_id: course.id,
      session_id: sessionId,
      price_paid: price,
      payment_status: 'paid',
      status: PurchaseStatus.ACTIVE,
      purchased_at: new Date(),
      attended: false,
      attendance_duration_minutes: 0,
    });
    ```

12. **Create Payment Hold**:
    ```typescript
    await manager.save(PaymentHold, {
      session_purchase_id: purchase.id,
      teacher_id: course.teacher_id,
      student_id: user.id,
      amount: price,
      status: HoldStatus.HELD,
      held_at: new Date(),
    });
    ```

13. **Load Full Purchase**:
    ```typescript
    const fullPurchase = await manager.findOne(SessionPurchase, {
      where: { id: purchase.id },
      relations: ['session', 'course', 'course.teacher'],
    });
    ```

14. **Return Response**:
    ```typescript
    return {
      id: fullPurchase.id,
      user_id: fullPurchase.user_id,
      session_id: fullPurchase.session_id,
      price_paid: fullPurchase.price_paid,
      payment_status: fullPurchase.payment_status,
      status: fullPurchase.status,
      purchased_at: fullPurchase.purchased_at,
      attended: fullPurchase.attended,
      session: {
        id: fullPurchase.session.id,
        title: fullPurchase.session.title,
        session_number: fullPurchase.session.session_number,
        scheduled_date: fullPurchase.session.scheduled_date,
        start_time: fullPurchase.session.start_time,
        end_time: fullPurchase.session.end_time,
      },
      course: {
        id: fullPurchase.course.id,
        title: fullPurchase.course.title,
        teacher: {
          id: fullPurchase.course.teacher.id,
          username: fullPurchase.course.teacher.username,
        },
      },
    };
    ```

**Success Response** (201 Created):
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440004",
  "user_id": "890e8400-e29b-41d4-a716-446655440003",
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "price_paid": 12.00,
  "payment_status": "paid",
  "status": "active",
  "purchased_at": "2025-11-26T10:35:00.000Z",
  "attended": false,
  "session": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Introduction & Basic Greetings",
    "session_number": 1,
    "scheduled_date": "2025-12-01",
    "start_time": "14:00",
    "end_time": "16:00"
  },
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "English Conversation for Beginners",
    "teacher": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "john_teacher"
    }
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Session not found |
| 400 | Bad Request | Session in past, already purchased, enrolled in full course, or insufficient credits |
| 500 | Internal Server Error | Database or transaction error |

---

### Flow 3: Cancel Enrollment (Refund)

**Endpoint**: `DELETE /api/enrollments/:enrollmentId`

**Authorization**: Student (enrollment owner) only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `enrollmentId`: UUID of the enrollment to cancel

**Request Body** (optional):
```json
{
  "reason": "Changed my mind"
}
```

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Find Enrollment**:
   ```typescript
   const enrollment = await enrollmentRepository.findOne({
     where: { id: enrollmentId, user_id: user.id },
     relations: ['course'],
   });
   
   if (!enrollment) {
     throw new NotFoundException('Enrollment not found');
   }
   ```

3. **Validate Can Cancel**:
   ```typescript
   if (enrollment.status === EnrollmentStatus.CANCELLED) {
     throw new BadRequestException('Enrollment is already cancelled');
   }
   
   if (enrollment.status === EnrollmentStatus.COMPLETED) {
     throw new BadRequestException('Cannot cancel completed enrollment');
   }
   ```

4. **Find Payment Hold**:
   ```typescript
   const hold = await holdRepository.findOne({
     where: {
       enrollment_id: enrollmentId,
       status: HoldStatus.HELD,
     },
   });
   
   if (!hold) {
     throw new BadRequestException('Payment has already been processed');
   }
   ```

5. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

6. **Refund Credit to Student**:
   ```typescript
   await manager.update(User, user.id, {
     credit_balance: () => `credit_balance + ${hold.amount}`,
   });
   ```

7. **Update Enrollment**:
   ```typescript
   await manager.update(CourseEnrollment, enrollmentId, {
     status: EnrollmentStatus.CANCELLED,
     cancelled_at: new Date(),
     refund_amount: hold.amount,
   });
   ```

8. **Update Payment Hold**:
   ```typescript
   await manager.update(PaymentHold, hold.id, {
     status: HoldStatus.REFUNDED,
     released_at: new Date(),
     notes: dto.reason || 'Cancelled by student',
   });
   ```

9. **Decrement Course Student Count**:
   ```typescript
   await manager.update(Course, enrollment.course_id, {
     current_students: () => 'current_students - 1',
   });
   ```

10. **Return Success Message**:
    ```typescript
    return {
      message: 'Enrollment cancelled and refunded successfully',
      refund_amount: hold.amount,
      refunded_at: new Date(),
    };
    ```

**Success Response** (200 OK):
```json
{
  "message": "Enrollment cancelled and refunded successfully",
  "refund_amount": 100.00,
  "refunded_at": "2025-11-26T10:40:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Enrollment not found |
| 400 | Bad Request | Already cancelled, completed, or payment already processed |
| 500 | Internal Server Error | Database or transaction error |

---

### Flow 4: Cancel Session Purchase (Refund)

**Endpoint**: `DELETE /api/enrollments/sessions/:purchaseId`

**Authorization**: Student (purchase owner) only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `purchaseId`: UUID of the purchase to cancel

**Request Body** (optional):
```json
{
  "reason": "Schedule conflict"
}
```

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Find Purchase**:
   ```typescript
   const purchase = await purchaseRepository.findOne({
     where: { id: purchaseId, user_id: user.id },
   });
   
   if (!purchase) {
     throw new NotFoundException('Purchase not found');
   }
   ```

3. **Validate Can Cancel**:
   ```typescript
   if (purchase.status === PurchaseStatus.CANCELLED) {
     throw new BadRequestException('Purchase is already cancelled');
   }
   
   if (purchase.attended) {
     throw new BadRequestException('Cannot cancel attended session');
   }
   
   if (purchase.status === PurchaseStatus.ATTENDED) {
     throw new BadRequestException('Cannot cancel attended session');
   }
   ```

4. **Find Payment Hold**:
   ```typescript
   const hold = await holdRepository.findOne({
     where: {
       session_purchase_id: purchaseId,
       status: HoldStatus.HELD,
     },
   });
   
   if (!hold) {
     throw new BadRequestException('Payment has already been processed');
   }
   ```

5. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

6. **Refund Credit to Student**:
   ```typescript
   await manager.update(User, user.id, {
     credit_balance: () => `credit_balance + ${hold.amount}`,
   });
   ```

7. **Update Purchase**:
   ```typescript
   await manager.update(SessionPurchase, purchaseId, {
     status: PurchaseStatus.CANCELLED,
     cancelled_at: new Date(),
     refund_amount: hold.amount,
   });
   ```

8. **Update Payment Hold**:
   ```typescript
   await manager.update(PaymentHold, hold.id, {
     status: HoldStatus.REFUNDED,
     released_at: new Date(),
     notes: dto.reason || 'Cancelled by student',
   });
   ```

9. **Return Success Message**:
   ```typescript
   return {
     message: 'Session purchase cancelled and refunded successfully',
     refund_amount: hold.amount,
     refunded_at: new Date(),
   };
   ```

**Success Response** (200 OK):
```json
{
  "message": "Session purchase cancelled and refunded successfully",
  "refund_amount": 12.00,
  "refunded_at": "2025-11-26T10:45:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Purchase not found |
| 400 | Bad Request | Already cancelled, attended, or payment already processed |
| 500 | Internal Server Error | Database or transaction error |

---

### Flow 5: Get My Enrollments

**Endpoint**: `GET /api/enrollments/me`

**Authorization**: Student only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters**:
```
?status=active
&page=1
&limit=20
```

**Query Parameter Descriptions**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | String | - | Filter by status (active/cancelled/completed) |
| `page` | Integer | 1 | Page number |
| `limit` | Integer | 20 | Items per page (max 100) |

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Build Query**:
   ```typescript
   const query = enrollmentRepository
     .createQueryBuilder('enrollment')
     .leftJoinAndSelect('enrollment.course', 'course')
     .leftJoinAndSelect('course.teacher', 'teacher')
     .where('enrollment.user_id = :userId', { userId: user.id });
   ```

3. **Apply Status Filter**:
   ```typescript
   if (status) {
     query.andWhere('enrollment.status = :status', { status });
   }
   ```

4. **Apply Sorting**:
   ```typescript
   query.orderBy('enrollment.created_at', 'DESC');
   ```

5. **Apply Pagination**:
   ```typescript
   const page = Math.max(1, parseInt(req.query.page) || 1);
   const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
   const skip = (page - 1) * limit;
   
   query.skip(skip).take(limit);
   ```

6. **Execute Query**:
   ```typescript
   const [enrollments, total] = await query.getManyAndCount();
   ```

7. **Format Response**:
   ```typescript
   const data = enrollments.map(e => ({
     id: e.id,
     course_id: e.course_id,
     enrollment_type: e.enrollment_type,
     total_price_paid: e.total_price_paid,
     payment_status: e.payment_status,
     status: e.status,
     completion_percentage: e.completion_percentage,
     enrolled_at: e.enrolled_at,
     cancelled_at: e.cancelled_at,
     refund_amount: e.refund_amount,
     course: {
       id: e.course.id,
       title: e.course.title,
       total_sessions: e.course.total_sessions,
       teacher: {
         id: e.course.teacher.id,
         username: e.course.teacher.username,
         avatar_url: e.course.teacher.avatar_url,
       },
     },
   }));
   
   return {
     data,
     total,
     page,
     limit,
     totalPages: Math.ceil(total / limit),
   };
   ```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "course_id": "550e8400-e29b-41d4-a716-446655440000",
      "enrollment_type": "full_course",
      "total_price_paid": 100.00,
      "payment_status": "paid",
      "status": "active",
      "completion_percentage": 30.00,
      "enrolled_at": "2025-11-26T10:30:00.000Z",
      "cancelled_at": null,
      "refund_amount": 0,
      "course": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "English Conversation for Beginners",
        "total_sessions": 10,
        "teacher": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "username": "john_teacher",
          "avatar_url": "https://example.com/avatars/john.jpg"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### Flow 6: Get My Session Purchases

**Endpoint**: `GET /api/enrollments/me/sessions`

**Authorization**: Student only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Query Parameters**:
```
?status=active
&page=1
&limit=20
```

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Build Query**:
   ```typescript
   const query = purchaseRepository
     .createQueryBuilder('purchase')
     .leftJoinAndSelect('purchase.session', 'session')
     .leftJoinAndSelect('purchase.course', 'course')
     .leftJoinAndSelect('course.teacher', 'teacher')
     .where('purchase.user_id = :userId', { userId: user.id });
   ```

3. **Apply Filters and Pagination** (similar to Flow 5)

4. **Execute and Format Response**:
   ```typescript
   const data = purchases.map(p => ({
     id: p.id,
     session_id: p.session_id,
     price_paid: p.price_paid,
     payment_status: p.payment_status,
     status: p.status,
     attended: p.attended,
     attendance_duration_minutes: p.attendance_duration_minutes,
     purchased_at: p.purchased_at,
     cancelled_at: p.cancelled_at,
     refund_amount: p.refund_amount,
     session: {
       id: p.session.id,
       title: p.session.title,
       session_number: p.session.session_number,
       scheduled_date: p.session.scheduled_date,
       start_time: p.session.start_time,
       end_time: p.session.end_time,
       status: p.session.status,
     },
     course: {
       id: p.course.id,
       title: p.course.title,
       teacher: {
         id: p.course.teacher.id,
         username: p.course.teacher.username,
       },
     },
   }));
   ```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "session_id": "660e8400-e29b-41d4-a716-446655440001",
      "price_paid": 12.00,
      "payment_status": "paid",
      "status": "active",
      "attended": false,
      "attendance_duration_minutes": 0,
      "purchased_at": "2025-11-26T10:35:00.000Z",
      "cancelled_at": null,
      "refund_amount": 0,
      "session": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Introduction & Basic Greetings",
        "session_number": 1,
        "scheduled_date": "2025-12-01",
        "start_time": "14:00",
        "end_time": "16:00",
        "status": "scheduled"
      },
      "course": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "English Conversation for Beginners",
        "teacher": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "username": "john_teacher"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### Flow 7: Check Session Access

**Endpoint**: `GET /api/enrollments/sessions/:sessionId/access`

**Authorization**: Student only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `sessionId`: UUID of the session to check access for

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Find Session**:
   ```typescript
   const session = await sessionRepository.findOne({
     where: { id: sessionId },
     relations: ['course'],
   });
   
   if (!session) {
     throw new NotFoundException('Session not found');
   }
   ```

3. **Check Full Course Enrollment**:
   ```typescript
   const enrollment = await enrollmentRepository.findOne({
     where: {
       user_id: user.id,
       course_id: session.course_id,
       status: EnrollmentStatus.ACTIVE,
     },
   });
   
   if (enrollment) {
     return { hasAccess: true, accessType: 'full_course_enrollment' };
   }
   ```

4. **Check Session Purchase**:
   ```typescript
   const purchase = await purchaseRepository.findOne({
     where: {
       user_id: user.id,
       session_id: sessionId,
       status: PurchaseStatus.ACTIVE,
     },
   });
   
   if (purchase) {
     return { hasAccess: true, accessType: 'session_purchase' };
   }
   ```

5. **No Access**:
   ```typescript
   return { hasAccess: false };
   ```

**Success Response** (200 OK):
```json
{
  "hasAccess": true,
  "accessType": "full_course_enrollment"
}
```

or

```json
{
  "hasAccess": true,
  "accessType": "session_purchase"
}
```

or

```json
{
  "hasAccess": false
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/enrollments/courses/:courseId` | Enroll in full course | ✅ | Student |
| POST | `/api/enrollments/sessions/:sessionId/purchase` | Purchase single session | ✅ | Student |
| DELETE | `/api/enrollments/:enrollmentId` | Cancel enrollment (refund) | ✅ | Student (owner) |
| DELETE | `/api/enrollments/sessions/:purchaseId` | Cancel session purchase (refund) | ✅ | Student (owner) |
| GET | `/api/enrollments/me` | Get my enrollments | ✅ | Student |
| GET | `/api/enrollments/me/sessions` | Get my session purchases | ✅ | Student |
| GET | `/api/enrollments/sessions/:sessionId/access` | Check session access | ✅ | Student |

---

## 🔄 Transaction Management

### Transaction Isolation

All enrollment and purchase operations use database transactions with **READ COMMITTED** isolation level to prevent:
- Race conditions (double enrollment)
- Inconsistent credit balances
- Orphaned payment holds

### Example Transaction Wrapper

```typescript
async enrollInCourse(userId: string, courseId: string) {
  return await this.dataSource.transaction(async (manager) => {
    // All database operations here are atomic
    // If any operation fails, everything rolls back
    
    // 1. Deduct credit
    await manager.update(User, userId, { ... });
    
    // 2. Create enrollment
    const enrollment = await manager.save(CourseEnrollment, { ... });
    
    // 3. Create payment hold
    await manager.save(PaymentHold, { ... });
    
    // 4. Update course count
    await manager.update(Course, courseId, { ... });
    
    return enrollment;
  });
}
```

### Rollback Scenarios

Transaction automatically rolls back if:
- Database constraint violation
- Insufficient credit balance
- Course is full
- Duplicate enrollment
- Any database error

---

## ✅ Validation Rules

### Enrollment Validation

```typescript
class EnrollCourseDto {
  @IsNotEmpty()
  @IsEnum(EnrollmentType)
  enrollment_type: EnrollmentType;
}
```

### Cancel Validation

```typescript
class CancelEnrollmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

---

## 🚨 Error Handling

### Common Errors

| Error | HTTP Status | When |
|-------|-------------|------|
| Insufficient Credit | 400 | User doesn't have enough credits |
| Already Enrolled | 400 | User already enrolled in course |
| Course Full | 400 | Course reached max students |
| Session in Past | 400 | Trying to purchase past session |
| Already Attended | 400 | Trying to cancel attended session |
| Payment Processed | 400 | Payment already released/refunded |

---

## 🧪 Testing Guide

### Test Scenario 1: Successful Enrollment

```bash
# 1. Add credits to user
PATCH http://localhost:3000/api/users/me/credits
Body: { "amount": 200 }

# 2. Enroll in course
POST http://localhost:3000/api/enrollments/courses/{courseId}
Headers: Authorization: Bearer {token}
Body: { "enrollment_type": "full_course" }

# Expected: 201 Created, enrollment record returned

# 3. Verify credit deducted
GET http://localhost:3000/api/users/me
# Expected: credit_balance reduced by course price

# 4. Verify payment hold created
GET http://localhost:3000/api/admin/payment-holds?student_id={userId}
# Expected: Hold record with status 'held'
```

### Test Scenario 2: Insufficient Credits

```bash
# 1. User has 50 credits, course costs 100
POST http://localhost:3000/api/enrollments/courses/{courseId}

# Expected: 400 Bad Request
# Error: "Insufficient credit balance. Required: 100, Available: 50"
```

### Test Scenario 3: Cancel and Refund

```bash
# 1. Enroll in course
POST http://localhost:3000/api/enrollments/courses/{courseId}

# 2. Cancel enrollment
DELETE http://localhost:3000/api/enrollments/{enrollmentId}
Body: { "reason": "Changed my mind" }

# Expected: 200 OK, refund_amount returned

# 3. Verify credit refunded
GET http://localhost:3000/api/users/me
# Expected: credit_balance restored
```

---

## 🎯 Success Criteria

Phase 2 is complete when:

- ✅ Students can enroll in full courses
- ✅ Students can purchase individual sessions
- ✅ Credit balance is correctly deducted
- ✅ Payment holds are created
- ✅ Students can cancel and get refunds
- ✅ Cannot enroll twice in same course
- ✅ Cannot purchase if already enrolled
- ✅ Cannot cancel attended sessions
- ✅ All transactions are atomic
- ✅ All validations work correctly
- ✅ All error cases are handled

---

**End of Phase 2 Documentation**
