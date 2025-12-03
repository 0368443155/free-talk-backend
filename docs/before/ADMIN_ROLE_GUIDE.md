# 🔐 Admin Role & Permissions Guide

**Version**: 1.0  
**Last Updated**: 2025-11-26

---

## 📋 Overview

This document outlines the **Admin role** permissions and capabilities across all phases of the 4Talk Platform.

---

## 👤 Admin Role Definition

### What is an Admin?

An **Admin** is a super-user with elevated permissions to:
- Manage all courses (create, edit, delete, publish)
- Manage all users (view, edit, suspend)
- Approve/reject teacher verifications
- Approve/reject withdrawal requests
- View all transactions and financial data
- Manage platform settings

### Admin vs Teacher vs Student

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| Browse courses | ✅ | ✅ | ✅ |
| Enroll in courses | ✅ | ✅ | ✅ |
| Create courses | ❌ | ✅ | ✅ |
| Manage own courses | ❌ | ✅ | ✅ |
| Manage ALL courses | ❌ | ❌ | ✅ |
| Approve teacher verification | ❌ | ❌ | ✅ |
| Approve withdrawals | ❌ | ❌ | ✅ |
| View all transactions | ❌ | Own only | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## 📚 Phase 1: Course Management

### Admin Permissions

#### ✅ Create Courses
**Endpoint**: `POST /api/courses`

**Authorization Logic**:
```typescript
const user = await getUserFromToken(req.headers.authorization);
if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
  throw new UnauthorizedException('Only teachers and admins can create courses');
}
```

**Use Case**: Admin can create courses on behalf of teachers or for platform-managed courses.

---

#### ✅ Edit ANY Course
**Endpoint**: `PATCH /api/courses/:id`

**Authorization Logic**:
```typescript
const user = await getUserFromToken(req.headers.authorization);
const course = await courseRepository.findOne({ where: { id: courseId } });

// Teacher can only edit own courses
if (user.role === 'teacher' && course.teacher_id !== user.id) {
  throw new ForbiddenException('You can only edit your own courses');
}

// Admin can edit any course
if (user.role === 'admin') {
  // Allow
}
```

**Use Case**: Admin can fix issues, update content, or moderate courses.

---

#### ✅ Delete ANY Course
**Endpoint**: `DELETE /api/courses/:id`

**Authorization Logic**:
```typescript
const user = await getUserFromToken(req.headers.authorization);
const course = await courseRepository.findOne({ where: { id: courseId } });

// Teacher can only delete own courses
if (user.role === 'teacher' && course.teacher_id !== user.id) {
  throw new ForbiddenException('You can only delete your own courses');
}

// Admin can delete any course
if (user.role === 'admin') {
  // Allow
}
```

**Use Case**: Admin can remove inappropriate or violating courses.

---

#### ✅ Publish/Unpublish ANY Course
**Endpoints**: 
- `PATCH /api/courses/:id/publish`
- `PATCH /api/courses/:id/unpublish`

**Authorization Logic**:
```typescript
const user = await getUserFromToken(req.headers.authorization);
const course = await courseRepository.findOne({ where: { id: courseId } });

// Teacher can only publish own courses
if (user.role === 'teacher' && course.teacher_id !== user.id) {
  throw new ForbiddenException('You can only publish your own courses');
}

// Admin can publish/unpublish any course
if (user.role === 'admin') {
  // Allow
}
```

**Use Case**: Admin can moderate course visibility, unpublish violating courses.

---

#### ✅ Manage Sessions for ANY Course
**Endpoints**:
- `POST /api/courses/:id/sessions` - Add session
- `PATCH /api/courses/:id/sessions/:sid` - Update session
- `DELETE /api/courses/:id/sessions/:sid` - Delete session

**Authorization Logic**: Same as course management (admin can manage any course's sessions).

---

## 📚 Phase 2: Enrollment Management

### Admin Permissions

#### ✅ View All Enrollments
**Endpoint**: `GET /api/admin/enrollments`

**Authorization**: Admin only

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "student_user",
        "email": "student@example.com"
      },
      "course": {
        "id": "uuid",
        "title": "English Conversation"
      },
      "total_price_paid": 100.00,
      "status": "active",
      "enrolled_at": "2025-11-26T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

#### ✅ Cancel ANY Enrollment (Force Refund)
**Endpoint**: `DELETE /api/admin/enrollments/:id`

**Authorization**: Admin only

**Use Case**: Admin can force-cancel enrollments for policy violations or disputes.

**Process**:
1. Find enrollment
2. Find payment hold
3. Refund to student
4. Update enrollment status to 'cancelled'
5. Decrement course student count
6. Log admin action

---

#### ✅ View All Payment Holds
**Endpoint**: `GET /api/admin/payment-holds`

**Authorization**: Admin only

**Query Parameters**:
```
?status=held
&teacher_id=uuid
&student_id=uuid
&page=1
&limit=20
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "teacher": {
        "id": "uuid",
        "username": "john_teacher"
      },
      "student": {
        "id": "uuid",
        "username": "student_user"
      },
      "amount": 12.00,
      "status": "held",
      "held_at": "2025-11-26T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

## 📚 Phase 3: Payment Management

### Admin Permissions

#### ✅ View All Transactions
**Endpoint**: `GET /api/admin/transactions`

**Authorization**: Admin only

**Query Parameters**:
```
?user_id=uuid
&type=payment_release
&status=completed
&from_date=2025-11-01
&to_date=2025-11-30
&page=1
&limit=50
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "john_teacher",
        "role": "teacher"
      },
      "type": "payment_release",
      "amount": 100.00,
      "balance_before": 500.00,
      "balance_after": 600.00,
      "status": "completed",
      "description": "Payment released for session",
      "created_at": "2025-11-26T10:00:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

---

#### ✅ Approve Withdrawal Requests
**Endpoint**: `PATCH /api/admin/withdrawals/:id/approve`

**Authorization**: Admin only

**Request Body**:
```json
{
  "admin_notes": "Processed via bank transfer on 2025-11-26"
}
```

**Process**:
1. Validate withdrawal exists and is pending
2. Update withdrawal status to 'completed'
3. Update transaction status to 'completed'
4. Send notification to teacher
5. Log admin action

---

#### ✅ Reject Withdrawal Requests
**Endpoint**: `PATCH /api/admin/withdrawals/:id/reject`

**Authorization**: Admin only

**Request Body**:
```json
{
  "admin_notes": "Invalid bank account information. Please update and resubmit."
}
```

**Process**:
1. Validate withdrawal exists and is pending
2. Restore teacher's balance (refund the deducted amount)
3. Update withdrawal status to 'rejected'
4. Update transaction status to 'failed'
5. Send notification to teacher with reason
6. Log admin action

---

#### ✅ View All Withdrawal Requests
**Endpoint**: `GET /api/admin/withdrawals`

**Authorization**: Admin only

**Query Parameters**:
```
?status=pending
&teacher_id=uuid
&from_date=2025-11-01
&to_date=2025-11-30
&page=1
&limit=20
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "teacher": {
        "id": "uuid",
        "username": "john_teacher",
        "email": "john@example.com"
      },
      "amount": 500.00,
      "status": "pending",
      "bank_account_info": {
        "bank_name": "ABC Bank",
        "account_number": "****7890"
      },
      "requested_at": "2025-11-26T10:00:00Z",
      "notes": "Monthly withdrawal"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

---

#### ✅ Manual Payment Release/Refund
**Endpoint**: `POST /api/admin/payment-holds/:id/release`

**Authorization**: Admin only

**Request Body**:
```json
{
  "action": "release",
  "reason": "Manual release by admin due to special circumstances",
  "release_percentage": 100
}
```

**Use Case**: Admin can manually release or refund payments for dispute resolution.

---

## 📚 Phase 4: Free Talk Rooms

### Admin Permissions

#### ✅ View All Rooms
**Endpoint**: `GET /api/admin/free-talk/rooms`

**Authorization**: Admin only

**Query Parameters**:
```
?status=active
&host_id=uuid
&page=1
&limit=50
```

---

#### ✅ Close ANY Room
**Endpoint**: `DELETE /api/admin/free-talk/rooms/:id`

**Authorization**: Admin only

**Use Case**: Admin can close inappropriate or violating rooms.

---

## 🔐 Implementation Guide

### 1. Create Admin Guard

**File**: `src/core/guards/admin.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
```

---

### 2. Create Teacher or Admin Guard

**File**: `src/core/guards/teacher-or-admin.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TeacherOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new ForbiddenException('Teacher or Admin access required');
    }

    return true;
  }
}
```

---

### 3. Use Guards in Controllers

**Example**: Course Controller

```typescript
import { Controller, Post, Get, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeacherOrAdminGuard } from '../guards/teacher-or-admin.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('courses')
export class CoursesController {
  // Create course - Teacher or Admin
  @Post()
  @UseGuards(JwtAuthGuard, TeacherOrAdminGuard)
  async createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: User) {
    return this.coursesService.create(dto, user);
  }

  // Edit course - Owner or Admin
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: User
  ) {
    // Check ownership or admin in service
    return this.coursesService.update(id, dto, user);
  }

  // Admin-only endpoint
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllCoursesAdmin(@Query() query: AdminCourseQuery) {
    return this.coursesService.getAllForAdmin(query);
  }
}
```

---

### 4. Service Layer Authorization

**Example**: Course Service

```typescript
async update(courseId: string, dto: UpdateCourseDto, user: User) {
  const course = await this.courseRepository.findOne({ where: { id: courseId } });

  if (!course) {
    throw new NotFoundException('Course not found');
  }

  // Check authorization
  const isOwner = course.teacher_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenException('You can only edit your own courses');
  }

  // Update course
  Object.assign(course, dto);
  return await this.courseRepository.save(course);
}
```

---

## 📊 Admin Dashboard Endpoints

### Platform Statistics

**Endpoint**: `GET /api/admin/statistics`

**Authorization**: Admin only

**Response**:
```json
{
  "users": {
    "total": 1000,
    "students": 800,
    "teachers": 180,
    "admins": 20
  },
  "courses": {
    "total": 150,
    "published": 120,
    "draft": 30
  },
  "enrollments": {
    "total": 500,
    "active": 450,
    "cancelled": 50
  },
  "revenue": {
    "total_earned": 50000.00,
    "pending_payments": 5000.00,
    "platform_commission": 15000.00
  }
}
```

---

## 🎯 Best Practices

### 1. Always Log Admin Actions

```typescript
async approveWithdrawal(withdrawalId: string, adminUser: User, notes: string) {
  // Perform action
  const withdrawal = await this.withdrawalService.approve(withdrawalId, notes);

  // Log admin action
  await this.auditLogService.log({
    admin_id: adminUser.id,
    action: 'approve_withdrawal',
    entity_type: 'withdrawal',
    entity_id: withdrawalId,
    details: { notes },
    timestamp: new Date(),
  });

  return withdrawal;
}
```

---

### 2. Require Reason for Sensitive Actions

```typescript
class RejectWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  admin_notes: string; // Required, minimum 10 characters
}
```

---

### 3. Send Notifications

```typescript
// After admin action
await this.notificationService.send({
  user_id: affectedUserId,
  type: 'admin_action',
  title: 'Action Taken by Admin',
  message: `Your withdrawal request has been ${action}. Reason: ${reason}`,
});
```

---

## 🔒 Security Considerations

1. **Multi-Factor Authentication**: Require MFA for admin accounts
2. **IP Whitelisting**: Restrict admin access to specific IPs
3. **Audit Logging**: Log all admin actions with timestamps
4. **Session Timeout**: Shorter session timeout for admin accounts (15 minutes)
5. **Approval Workflow**: Require multiple admins for critical actions

---

## 📝 Summary

### Admin Can:

✅ Create, edit, delete, publish ANY course  
✅ Manage sessions for ANY course  
✅ View all enrollments and payment holds  
✅ Approve/reject withdrawal requests  
✅ View all transactions  
✅ Manually release/refund payments  
✅ Close any free talk room  
✅ View platform statistics  
✅ Manage users  

### Admin Cannot:

❌ Bypass payment system (must follow same rules)  
❌ Delete audit logs  
❌ Access without authentication  

---

**End of Admin Role Guide**
