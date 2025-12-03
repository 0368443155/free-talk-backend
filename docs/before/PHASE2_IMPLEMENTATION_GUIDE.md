# 📚 Phase 2: Enrollment & Access Control Implementation Guide

**Version**: 2.0  
**Status**: 🚀 **READY TO IMPLEMENT**  
**Priority**: Critical  
**Estimated Time**: 5-7 days

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current System Analysis](#current-system-analysis)
3. [Stage 1: Payment System Activation](#stage-1-payment-system-activation)
4. [Stage 2: Access Control & Permissions](#stage-2-access-control--permissions)
5. [Stage 3: Meeting Time Management](#stage-3-meeting-time-management)
6. [Testing Guide](#testing-guide)
7. [Deployment Checklist](#deployment-checklist)

---

## 📋 Overview

### Goals

Phase 2 tập trung vào 3 mục tiêu chính:

1. **Payment System** (Udemy-style)
   - Admin set credits cho users
   - Users dùng credits để mua courses/lessons
   - 1 credit = $1
   - Payment hold (escrow) cho đến khi lesson hoàn thành

2. **Access Control** (Udemy-style)
   - Chỉ users đã mua mới được:
     - Join meeting rooms
     - Xem materials
     - Access lesson content
   - Free preview lessons (đánh dấu `is_preview`)
   - Locked content cho unpurchased lessons

3. **Meeting Time Management**
   - Meetings tự động start/end theo scheduled time
   - Không cho join trước/sau thời gian quy định
   - Auto-update meeting status

---

## 🔍 Current System Analysis

### ✅ What's Already Implemented

#### Enrollment Service (COMPLETE)
```typescript
// File: src/features/courses/enrollment.service.ts

✅ enrollFullCourse() - Enroll in full course
✅ purchaseSession() - Purchase single session  
✅ cancelEnrollment() - Refund full course
✅ cancelSessionPurchase() - Refund session
✅ getMyEnrollments() - Get user's enrollments
✅ getMySessionPurchases() - Get user's purchases
✅ hasAccessToSession() - Check access (NEEDS UPDATE)
```

#### Database Schema (COMPLETE)
```sql
✅ course_enrollments - Track enrollments
✅ session_purchases - Track session purchases
✅ payment_holds - Escrow payments
✅ users.credit_balance - User credits
```

#### Payment Flow (COMPLETE)
```
Student → Pay credits → Deduct from balance → Hold payment → 
Session happens → Release to teacher OR refund
```

---

### ⚠️ What Needs to Be Added

#### 1. Lesson Preview System
```typescript
// Add to lessons table
ALTER TABLE lessons
ADD COLUMN is_preview BOOLEAN DEFAULT false,
ADD COLUMN is_free BOOLEAN DEFAULT false;
```

#### 2. Access Control Middleware
```typescript
// New: Check if user has access before joining meeting
@UseGuards(CourseAccessGuard)
```

#### 3. Admin Credit Management
```typescript
// New: Admin can set credits for users
POST /api/admin/users/:userId/credits
```

#### 4. Meeting Time Validation
```typescript
// New: Validate meeting time before join
canJoinMeeting(lessonId, currentTime)
```

#### 5. Material Access Control
```typescript
// New: Check access before showing materials
hasAccessToMaterial(userId, materialId)
```

---

## 🎯 Stage 1: Payment System Activation

**Time**: 2-3 days  
**Priority**: High

---

### Step 1.1: Add Preview Fields to Lessons

#### Migration

```typescript
// migrations/YYYYMMDDHHMMSS-AddPreviewFieldsToLessons.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreviewFieldsToLessons1732700000000 implements MigrationInterface {
  name = 'AddPreviewFieldsToLessons1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lessons
      ADD COLUMN is_preview BOOLEAN DEFAULT false,
      ADD COLUMN is_free BOOLEAN DEFAULT false,
      ADD INDEX idx_is_preview (is_preview),
      ADD INDEX idx_is_free (is_free)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lessons
      DROP INDEX idx_is_free,
      DROP INDEX idx_is_preview,
      DROP COLUMN is_free,
      DROP COLUMN is_preview
    `);
  }
}
```

#### Update Lesson Entity

```typescript
// src/features/courses/entities/lesson.entity.ts

@Entity('lessons')
export class Lesson {
  // ... existing fields ...

  // Preview & Free Access
  @Column({ type: 'boolean', default: false })
  is_preview: boolean; // Lesson này có phải là preview không

  @Column({ type: 'boolean', default: false })
  is_free: boolean; // Lesson này free cho tất cả users

  // ... rest of entity ...
}
```

#### Update DTOs

```typescript
// src/features/courses/dto/lesson.dto.ts

export class CreateLessonDto {
  // ... existing fields ...

  @ApiPropertyOptional({ description: 'Is this a preview lesson?' })
  @IsOptional()
  @IsBoolean()
  is_preview?: boolean;

  @ApiPropertyOptional({ description: 'Is this a free lesson?' })
  @IsOptional()
  @IsBoolean()
  is_free?: boolean;
}

export class UpdateLessonDto {
  // ... existing fields ...

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_preview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_free?: boolean;
}
```

---

### Step 1.2: Admin Credit Management

#### Create Admin Credit Service

```typescript
// src/features/admin/admin-credit.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../users/user.entity';
import { CreditTransaction, TransactionType } from '../credits/entities/credit-transaction.entity';

@Injectable()
export class AdminCreditService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * Admin sets credits for a user
   */
  async setUserCredits(
    adminId: string,
    userId: string,
    amount: number,
    notes?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldBalance = user.credit_balance || 0;
      const newBalance = amount;
      const difference = newBalance - oldBalance;

      // Update user balance
      await manager.update(User, userId, {
        credit_balance: newBalance,
      });

      // Create transaction record
      await manager.save(CreditTransaction, {
        user_id: userId,
        type: difference > 0 ? TransactionType.ADMIN_CREDIT : TransactionType.ADMIN_DEBIT,
        amount: Math.abs(difference),
        balance_before: oldBalance,
        balance_after: newBalance,
        description: notes || `Admin ${difference > 0 ? 'added' : 'removed'} credits`,
        reference_id: adminId,
        reference_type: 'admin_adjustment',
        status: 'completed',
      });

      return {
        user_id: userId,
        old_balance: oldBalance,
        new_balance: newBalance,
        difference: difference,
      };
    });
  }

  /**
   * Admin adds credits to user
   */
  async addUserCredits(
    adminId: string,
    userId: string,
    amount: number,
    notes?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldBalance = user.credit_balance || 0;
      const newBalance = oldBalance + amount;

      await manager.update(User, userId, {
        credit_balance: () => `credit_balance + ${amount}`,
      });

      await manager.save(CreditTransaction, {
        user_id: userId,
        type: TransactionType.ADMIN_CREDIT,
        amount: amount,
        balance_before: oldBalance,
        balance_after: newBalance,
        description: notes || `Admin added ${amount} credits`,
        reference_id: adminId,
        reference_type: 'admin_adjustment',
        status: 'completed',
      });

      return {
        user_id: userId,
        old_balance: oldBalance,
        new_balance: newBalance,
        added: amount,
      };
    });
  }

  /**
   * Admin removes credits from user
   */
  async removeUserCredits(
    adminId: string,
    userId: string,
    amount: number,
    notes?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldBalance = user.credit_balance || 0;
      const newBalance = Math.max(0, oldBalance - amount);

      await manager.update(User, userId, {
        credit_balance: newBalance,
      });

      await manager.save(CreditTransaction, {
        user_id: userId,
        type: TransactionType.ADMIN_DEBIT,
        amount: amount,
        balance_before: oldBalance,
        balance_after: newBalance,
        description: notes || `Admin removed ${amount} credits`,
        reference_id: adminId,
        reference_type: 'admin_adjustment',
        status: 'completed',
      });

      return {
        user_id: userId,
        old_balance: oldBalance,
        new_balance: newBalance,
        removed: amount,
      };
    });
  }
}
```

#### Create Admin Credit Controller

```typescript
// src/features/admin/admin-credit.controller.ts

import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { AdminCreditService } from './admin-credit.service';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

class SetCreditsDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class AddCreditsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Admin - Credits')
@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminCreditController {
  constructor(private adminCreditService: AdminCreditService) {}

  @Post('users/:userId/set')
  @ApiOperation({ summary: 'Set user credits (Admin only)' })
  async setUserCredits(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() dto: SetCreditsDto,
  ) {
    return this.adminCreditService.setUserCredits(
      req.user.id,
      userId,
      dto.amount,
      dto.notes,
    );
  }

  @Post('users/:userId/add')
  @ApiOperation({ summary: 'Add credits to user (Admin only)' })
  async addUserCredits(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() dto: AddCreditsDto,
  ) {
    return this.adminCreditService.addUserCredits(
      req.user.id,
      userId,
      dto.amount,
      dto.notes,
    );
  }

  @Post('users/:userId/remove')
  @ApiOperation({ summary: 'Remove credits from user (Admin only)' })
  async removeUserCredits(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() dto: AddCreditsDto,
  ) {
    return this.adminCreditService.removeUserCredits(
      req.user.id,
      userId,
      dto.amount,
      dto.notes,
    );
  }
}
```

---

### Step 1.3: Update Enrollment Service

#### Add hasAccessToLesson Method

```typescript
// src/features/courses/enrollment.service.ts

/**
 * Check if user has access to lesson
 */
async hasAccessToLesson(userId: string, lessonId: string): Promise<{
  hasAccess: boolean;
  reason?: string;
  requiresPurchase?: boolean;
}> {
  const lesson = await this.dataSource.manager.findOne(Lesson, {
    where: { id: lessonId },
    relations: ['session', 'session.course'],
  });

  if (!lesson) {
    return { hasAccess: false, reason: 'Lesson not found' };
  }

  // Check if lesson is free or preview
  if (lesson.is_free || lesson.is_preview) {
    return { hasAccess: true, reason: 'Free/Preview lesson' };
  }

  const session = lesson.session;
  const course = session.course;

  // Check if user is the teacher
  if (course.teacher_id === userId) {
    return { hasAccess: true, reason: 'Course owner' };
  }

  // Check if enrolled in full course
  const enrollment = await this.enrollmentRepository.findOne({
    where: {
      user_id: userId,
      course_id: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  if (enrollment) {
    return { hasAccess: true, reason: 'Enrolled in course' };
  }

  // Check if purchased this specific session
  const purchase = await this.sessionPurchaseRepository.findOne({
    where: {
      user_id: userId,
      session_id: session.id,
      status: PurchaseStatus.ACTIVE,
    },
  });

  if (purchase) {
    return { hasAccess: true, reason: 'Purchased session' };
  }

  // No access
  return {
    hasAccess: false,
    reason: 'Purchase required',
    requiresPurchase: true,
  };
}

/**
 * Check if user has access to material
 */
async hasAccessToMaterial(userId: string, materialId: string): Promise<boolean> {
  const material = await this.dataSource.manager.findOne(LessonMaterial, {
    where: { id: materialId },
    relations: ['lesson'],
  });

  if (!material) return false;

  const access = await this.hasAccessToLesson(userId, material.lesson_id);
  return access.hasAccess;
}
```

---

### Step 1.4: Testing Payment System

#### Test 1: Admin Sets Credits

```bash
# Login as admin
POST http://localhost:3000/api/auth/login
Body: { "email": "admin@example.com", "password": "..." }
# Save admin_token

# Set credits for student
POST http://localhost:3000/api/admin/credits/users/{student_id}/set
Headers: Authorization: Bearer {admin_token}
Body: {
  "amount": 100,
  "notes": "Initial credits for testing"
}

# Expected Response:
{
  "user_id": "...",
  "old_balance": 0,
  "new_balance": 100,
  "difference": 100
}
```

#### Test 2: Student Purchases Course

```bash
# Login as student
POST http://localhost:3000/api/auth/login
Body: { "email": "student@example.com", "password": "..." }
# Save student_token

# Check balance
GET http://localhost:3000/api/users/me
Headers: Authorization: Bearer {student_token}
# Should show credit_balance: 100

# Enroll in course (price: 50 credits)
POST http://localhost:3000/api/enrollments/courses/{course_id}
Headers: Authorization: Bearer {student_token}
Body: {
  "enrollment_type": "full_course"
}

# Expected: Success, balance now 50
```

#### Test 3: Check Access

```bash
# Check if has access to lesson
GET http://localhost:3000/api/enrollments/lessons/{lesson_id}/access
Headers: Authorization: Bearer {student_token}

# Expected:
{
  "hasAccess": true,
  "reason": "Enrolled in course"
}
```

---

## 🔐 Stage 2: Access Control & Permissions

**Time**: 2-3 days  
**Priority**: High

---

### Step 2.1: Create Access Control Guard

```typescript
// src/features/courses/guards/course-access.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentService } from '../enrollment.service';

@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(private enrollmentService: EnrollmentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const lessonId = request.params.lessonId || request.body.lessonId;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!lessonId) {
      throw new ForbiddenException('Lesson ID required');
    }

    const access = await this.enrollmentService.hasAccessToLesson(
      user.id,
      lessonId,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException(
        access.reason || 'You need to purchase this course to access this lesson',
      );
    }

    return true;
  }
}
```

---

### Step 2.2: Apply Guard to Meeting Join

```typescript
// src/features/meeting/meeting.controller.ts

@Post('lessons/:lessonId/join')
@UseGuards(JwtAuthGuard, CourseAccessGuard) // ✅ Add access guard
@ApiBearerAuth()
@ApiOperation({ summary: 'Join lesson meeting' })
async joinLessonMeeting(
  @Param('lessonId') lessonId: string,
  @Req() req: any,
) {
  const userId = req.user.id;
  return this.meetingService.joinLessonMeeting(userId, lessonId);
}
```

---

### Step 2.3: Material Access Control

```typescript
// src/features/courses/courses.controller.ts

@Get('lessons/:lessonId/materials')
@UseGuards(JwtAuthGuard, CourseAccessGuard) // ✅ Add access guard
@ApiBearerAuth()
@ApiOperation({ summary: 'Get lesson materials (requires purchase)' })
async getLessonMaterials(
  @Param('lessonId') lessonId: string,
  @Req() req: any,
) {
  return this.coursesService.getLessonMaterials(lessonId);
}

@Get('materials/:materialId/download')
@UseGuards(JwtAuthGuard) // ✅ Check access in service
@ApiBearerAuth()
@ApiOperation({ summary: 'Download material (requires purchase)' })
async downloadMaterial(
  @Param('materialId') materialId: string,
  @Req() req: any,
  @Res() res: Response,
) {
  const userId = req.user.id;
  
  // Check access
  const hasAccess = await this.enrollmentService.hasAccessToMaterial(
    userId,
    materialId,
  );

  if (!hasAccess) {
    throw new ForbiddenException('Purchase required to download this material');
  }

  // Download logic...
}
```

---

### Step 2.4: Admin Material Management

```typescript
// src/features/admin/admin-material.controller.ts

@Controller('admin/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminMaterialController {
  constructor(
    private coursesService: CoursesService,
    private notificationService: NotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all materials (Admin only)' })
  async getAllMaterials() {
    return this.coursesService.getAllMaterials();
  }

  @Delete(':materialId')
  @ApiOperation({ summary: 'Delete material and notify teacher (Admin only)' })
  async deleteMaterial(
    @Param('materialId') materialId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const material = await this.coursesService.getMaterialById(materialId);
    
    // Delete material
    await this.coursesService.deleteMaterial(materialId);

    // Notify teacher
    await this.notificationService.create({
      user_id: material.lesson.session.course.teacher_id,
      type: 'material_removed',
      title: 'Material Removed by Admin',
      message: `Your material "${material.title}" was removed. Reason: ${body.reason}`,
      data: {
        material_id: materialId,
        reason: body.reason,
        admin_id: req.user.id,
      },
    });

    return { message: 'Material deleted and teacher notified' };
  }
}
```

---

### Step 2.5: Frontend Access Control

#### Lesson List Component

```typescript
// Example frontend logic

interface Lesson {
  id: string;
  title: string;
  is_preview: boolean;
  is_free: boolean;
  hasAccess: boolean; // From API
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const canAccess = lesson.is_preview || lesson.is_free || lesson.hasAccess;

  return (
    <div className="lesson-card">
      <h3>{lesson.title}</h3>
      
      {lesson.is_preview && <Badge>Preview</Badge>}
      {lesson.is_free && <Badge>Free</Badge>}
      
      {canAccess ? (
        <Button onClick={() => joinLesson(lesson.id)}>
          Join Lesson
        </Button>
      ) : (
        <div className="locked-content">
          <LockIcon />
          <p>Purchase course to unlock</p>
          <Button onClick={() => purchaseCourse()}>
            Purchase Course
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## ⏰ Stage 3: Meeting Time Management

**Time**: 1-2 days  
**Priority**: Medium

---

### Step 3.1: Add Time Validation to Lesson

```typescript
// src/features/courses/entities/lesson.entity.ts

@Entity('lessons')
export class Lesson {
  // ... existing fields ...

  // Virtual properties for time validation
  get scheduled_datetime(): Date {
    const [hours, minutes] = this.start_time.split(':');
    const date = new Date(this.scheduled_date);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  get end_datetime(): Date {
    const [hours, minutes] = this.end_time.split(':');
    const date = new Date(this.scheduled_date);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  get is_past(): boolean {
    return this.end_datetime < new Date();
  }

  get is_upcoming(): boolean {
    return this.scheduled_datetime > new Date();
  }

  get is_ongoing(): boolean {
    const now = new Date();
    return now >= this.scheduled_datetime && now <= this.end_datetime;
  }

  get can_join(): boolean {
    // Allow join 15 minutes before and during lesson
    const now = new Date();
    const joinStartTime = new Date(this.scheduled_datetime.getTime() - 15 * 60 * 1000);
    return now >= joinStartTime && now <= this.end_datetime;
  }
}
```

---

### Step 3.2: Update Meeting Service

```typescript
// src/features/meeting/meeting.service.ts

async joinLessonMeeting(userId: string, lessonId: string) {
  const lesson = await this.lessonRepository.findOne({
    where: { id: lessonId },
    relations: ['meeting', 'session', 'session.course'],
  });

  if (!lesson) {
    throw new NotFoundException('Lesson not found');
  }

  // Check time
  if (!lesson.can_join) {
    if (lesson.is_past) {
      throw new BadRequestException('This lesson has ended');
    }
    if (lesson.is_upcoming) {
      const minutesUntilStart = Math.floor(
        (lesson.scheduled_datetime.getTime() - Date.now()) / (60 * 1000)
      );
      throw new BadRequestException(
        `This lesson starts in ${minutesUntilStart} minutes. You can join 15 minutes before the scheduled time.`
      );
    }
  }

  // Auto-start meeting if it's time
  if (lesson.meeting && lesson.meeting.status === MeetingStatus.SCHEDULED) {
    if (lesson.is_ongoing) {
      await this.meetingRepository.update(lesson.meeting.id, {
        status: MeetingStatus.LIVE,
        started_at: new Date(),
      });
    }
  }

  // Join logic...
}
```

---

### Step 3.3: Auto-End Meetings (Cron Job)

```typescript
// src/features/meeting/meeting-scheduler.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Lesson, LessonStatus } from '../courses/entities/lesson.entity';
import { Meeting, MeetingStatus } from './entities/meeting.entity';

@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
  ) {}

  /**
   * Check and end meetings every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndEndMeetings() {
    this.logger.log('Checking for meetings to end...');

    const now = new Date();

    // Find lessons that have ended but meeting is still live
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.meeting', 'meeting')
      .where('lesson.status != :completed', { completed: LessonStatus.COMPLETED })
      .andWhere('meeting.status = :live', { live: MeetingStatus.LIVE })
      .getMany();

    for (const lesson of lessons) {
      if (lesson.is_past && lesson.meeting) {
        this.logger.log(`Ending meeting for lesson: ${lesson.id}`);

        // End meeting
        await this.meetingRepository.update(lesson.meeting.id, {
          status: MeetingStatus.ENDED,
          ended_at: new Date(),
        });

        // Update lesson status
        await this.lessonRepository.update(lesson.id, {
          status: LessonStatus.COMPLETED,
        });
      }
    }

    this.logger.log('Meeting check completed');
  }

  /**
   * Auto-start meetings 15 minutes before scheduled time
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndStartMeetings() {
    this.logger.log('Checking for meetings to start...');

    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

    // Find lessons starting soon
    const lessons = await this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.meeting', 'meeting')
      .where('lesson.status = :scheduled', { scheduled: LessonStatus.SCHEDULED })
      .andWhere('meeting.status = :meetingScheduled', { meetingScheduled: MeetingStatus.SCHEDULED })
      .getMany();

    for (const lesson of lessons) {
      const lessonStart = lesson.scheduled_datetime;

      // If lesson starts within 15 minutes, make meeting joinable
      if (lessonStart <= in15Minutes && lessonStart > now) {
        this.logger.log(`Making meeting joinable for lesson: ${lesson.id}`);
        
        // Update meeting to allow joins
        await this.meetingRepository.update(lesson.meeting.id, {
          status: MeetingStatus.LIVE,
          started_at: new Date(),
        });
      }
    }

    this.logger.log('Meeting start check completed');
  }
}
```

---

## 🧪 Testing Guide

### Test Scenario 1: Free Preview Lesson

```bash
# 1. Admin marks lesson as preview
PATCH http://localhost:3000/api/courses/lessons/{lesson_id}
Headers: Authorization: Bearer {admin_token}
Body: {
  "is_preview": true
}

# 2. Student (not purchased) tries to join
POST http://localhost:3000/api/meetings/lessons/{lesson_id}/join
Headers: Authorization: Bearer {student_token}

# Expected: Success (preview lesson)
```

### Test Scenario 2: Locked Lesson

```bash
# 1. Student tries to join non-preview lesson without purchase
POST http://localhost:3000/api/meetings/lessons/{lesson_id}/join
Headers: Authorization: Bearer {student_token}

# Expected: 403 Forbidden
# Message: "You need to purchase this course to access this lesson"
```

### Test Scenario 3: After Purchase

```bash
# 1. Student purchases course
POST http://localhost:3000/api/enrollments/courses/{course_id}
Headers: Authorization: Bearer {student_token}

# 2. Student joins lesson
POST http://localhost:3000/api/meetings/lessons/{lesson_id}/join
Headers: Authorization: Bearer {student_token}

# Expected: Success
```

### Test Scenario 4: Time Validation

```bash
# 1. Try to join 1 hour before lesson
POST http://localhost:3000/api/meetings/lessons/{lesson_id}/join
Headers: Authorization: Bearer {student_token}

# Expected: 400 Bad Request
# Message: "This lesson starts in 60 minutes. You can join 15 minutes before..."

# 2. Try to join after lesson ended
# Expected: 400 Bad Request
# Message: "This lesson has ended"
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Backup database
- [ ] Test all payment flows on staging
- [ ] Test access control on staging
- [ ] Test time validation on staging
- [ ] Verify admin credit management
- [ ] Test refund flows

### Database Migrations

- [ ] Run migration: Add preview fields to lessons
- [ ] Verify all indexes created
- [ ] Check foreign keys

### Code Deployment

- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Update API documentation
- [ ] Enable cron jobs for meeting scheduler

### Post-Deployment

- [ ] Monitor error logs
- [ ] Test payment flow in production
- [ ] Test access control in production
- [ ] Verify cron jobs running
- [ ] Monitor credit transactions

### Rollback Plan

If issues occur:
1. Disable payment endpoints
2. Rollback database migrations
3. Restore previous code version
4. Notify users of maintenance

---

## 📊 Summary

### Stage 1: Payment System (2-3 days)
- ✅ Add preview/free fields to lessons
- ✅ Admin credit management
- ✅ Update enrollment service
- ✅ Test payment flows

### Stage 2: Access Control (2-3 days)
- ✅ Create access guard
- ✅ Apply to meeting join
- ✅ Apply to material access
- ✅ Admin material management
- ✅ Frontend locked content UI

### Stage 3: Time Management (1-2 days)
- ✅ Time validation in lesson entity
- ✅ Update meeting join logic
- ✅ Auto-start/end meetings (cron)
- ✅ Test time-based access

### Total Time: 5-7 days

---

**End of Document**
