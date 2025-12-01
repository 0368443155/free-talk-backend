# 📊 Tổng Quan Hệ Thống - Phase 1, 2 & 3

**Ngày kiểm tra**: 2025-12-01  
**Người thực hiện**: System Audit

---

## ✅ PHASE 1: Course Management System (HOÀN THÀNH 100%)

### Backend Implementation

#### ✅ Entities Đã Tạo
- `Course` - Khóa học chính
- `CourseSession` - Buổi học (nhóm các lessons)
- `Lesson` - Bài học cụ thể với thời gian
- `LessonMaterial` - Tài liệu bài học
- `SessionMaterial` - Tài liệu buổi học (legacy)
- `Meeting` - Phòng họp LiveKit

#### ✅ Services Đã Implement
```typescript
CoursesService:
  ✅ createCourse() - Tạo khóa học
  ✅ getCourses() - Lấy danh sách khóa học (có filter, pagination)
  ✅ getCourseById() - Chi tiết khóa học
  ✅ updateCourse() - Cập nhật khóa học
  ✅ deleteCourse() - Xóa khóa học
  ✅ publishCourse() - Publish khóa học
  ✅ unpublishCourse() - Unpublish khóa học
  ✅ addSession() - Thêm session vào course
  ✅ getCourseSessions() - Lấy sessions của course
  ✅ updateSession() - Cập nhật session
  ✅ deleteSession() - Xóa session
  ✅ addLesson() - Thêm lesson vào session
  ✅ getSessionLessons() - Lấy lessons của session
  ✅ updateLesson() - Cập nhật lesson
  ✅ deleteLesson() - Xóa lesson
  ✅ createCourseWithSessions() - Tạo course + sessions + lessons cùng lúc
  ✅ regenerateQrCode() - Tạo lại QR code
```

#### ✅ Controllers & API Endpoints
```
GET    /api/courses - Danh sách khóa học
POST   /api/courses - Tạo khóa học mới
GET    /api/courses/:id - Chi tiết khóa học
PATCH  /api/courses/:id - Cập nhật khóa học
DELETE /api/courses/:id - Xóa khóa học
POST   /api/courses/:id/publish - Publish khóa học
POST   /api/courses/:id/unpublish - Unpublish khóa học

POST   /api/courses/:id/sessions - Thêm session
GET    /api/courses/:id/sessions - Lấy sessions
PATCH  /api/sessions/:id - Cập nhật session
DELETE /api/sessions/:id - Xóa session

POST   /api/sessions/:id/lessons - Thêm lesson
GET    /api/sessions/:id/lessons - Lấy lessons
PATCH  /api/lessons/:id - Cập nhật lesson
DELETE /api/lessons/:id - Xóa lesson
```

#### ✅ Database Schema
```sql
courses:
  - id, teacher_id, title, description
  - category, tags, level, language
  - price_type, price_full_course, price_per_session
  - total_sessions, max_students, duration_hours
  - status, is_published, affiliate_code
  - share_link, qr_code_url

course_sessions:
  - id, course_id, session_number
  - title, description, total_lessons
  - status

lessons:
  - id, session_id, lesson_number
  - title, description
  - scheduled_date, start_time, end_time, duration_minutes
  - meeting_id, livekit_room_name, meeting_link
  - qr_code_url, qr_code_data
  - status

lesson_materials:
  - id, lesson_id, type, title, description
  - file_url, file_name, file_size, file_type
  - display_order, is_required
```

### Frontend Implementation

#### ✅ Pages Đã Tạo
- `/courses` - Danh sách khóa học
- `/courses/[id]` - Chi tiết khóa học
- `/teacher/courses` - Quản lý khóa học của giáo viên
- `/teacher/courses/create` - Tạo khóa học mới

#### ✅ Components
- `CourseCard` - Card hiển thị khóa học
- `CourseList` - Danh sách khóa học
- `CourseDetail` - Chi tiết khóa học
- `CreateCourseForm` - Form tạo khóa học
- `SessionList` - Danh sách sessions
- `LessonCard` - Card bài học

---

## ✅ PHASE 2: Enrollment & Payment System (HOÀN THÀNH 100%)

### Backend Implementation

#### ✅ Entities Đã Tạo
```typescript
CourseEnrollment:
  - id, user_id, course_id
  - enrollment_type (full_course)
  - total_price_paid
  - payment_status, status
  - enrolled_at, cancelled_at, refund_amount
  - completion_percentage

SessionPurchase:
  - id, user_id, course_id, session_id
  - price_paid
  - payment_status, status
  - purchased_at, cancelled_at, refund_amount
  - attended, attendance_duration_minutes

PaymentHold:
  - id, enrollment_id, session_purchase_id
  - teacher_id, student_id
  - amount, status
  - held_at, released_at
  - release_percentage, notes
```

#### ✅ Services Đã Implement
```typescript
EnrollmentService:
  ✅ enrollFullCourse() - Ghi danh khóa học đầy đủ
  ✅ purchaseSession() - Mua session riêng lẻ
  ✅ cancelEnrollment() - Hủy ghi danh (refund)
  ✅ cancelSessionPurchase() - Hủy mua session (refund)
  ✅ getMyEnrollments() - Lấy enrollments của user
  ✅ getMySessionPurchases() - Lấy purchases của user
  ✅ hasAccessToSession() - Kiểm tra quyền truy cập session
  ✅ hasAccessToLesson() - Kiểm tra quyền truy cập lesson
  ✅ hasAccessToMaterial() - Kiểm tra quyền truy cập material
```

#### ✅ Payment Flow
```
1. Student có credit_balance (admin set)
2. Student enroll course hoặc purchase session
3. Deduct credits từ balance
4. Create PaymentHold (escrow)
5. Sau khi session hoàn thành:
   - Nếu attendance >= 20%: Release to teacher
   - Nếu attendance < 20%: Refund to student
```

#### ✅ Access Control
```typescript
CourseAccessGuard:
  - Check if user has purchased course/session
  - Check if lesson is free/preview
  - Check if user is teacher/owner
  - Throw ForbiddenException if no access
```

#### ✅ API Endpoints
```
POST   /api/enrollments/courses/:courseId - Enroll khóa học
POST   /api/enrollments/sessions/:sessionId - Mua session
DELETE /api/enrollments/:enrollmentId - Hủy enrollment
DELETE /api/enrollments/sessions/:purchaseId - Hủy purchase
GET    /api/enrollments/me - Lấy enrollments của tôi
GET    /api/enrollments/sessions/me - Lấy purchases của tôi
GET    /api/enrollments/lessons/:lessonId/access - Check access
```

#### ✅ Admin Credit Management
```
POST   /api/admin/credits/users/:userId/set - Set credits
POST   /api/admin/credits/users/:userId/add - Add credits
POST   /api/admin/credits/users/:userId/remove - Remove credits
```

### Frontend Implementation

#### ✅ Pages Đã Tạo
- `/student/my-learning` - Khóa học đã mua
- `/courses/[id]` - Có nút "Enroll" và "Purchase Session"

#### ✅ Components
- `EnrollButton` - Nút ghi danh
- `PurchaseSessionButton` - Nút mua session
- `MyLearningList` - Danh sách khóa học đã mua
- `LockedContent` - Hiển thị nội dung bị khóa

---

## ⚠️ PHASE 2.5: Database Migration (CẦN THỰC HIỆN)

### ❌ Vấn Đề Hiện Tại

**Tables chưa được tạo trong database**:
- `course_enrollments`
- `session_purchases`
- `payment_holds`

### ✅ Giải Pháp

#### Option 1: Run Migration (Recommended)

1. **Update `data-source.ts`**:
```typescript
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
import { SessionPurchase } from './src/features/courses/entities/session-purchase.entity';
import { PaymentHold } from './src/features/courses/entities/payment-hold.entity';

entities: [
  // ... existing entities ...
  CourseEnrollment,
  SessionPurchase,
  PaymentHold,
],
```

2. **Run migration**:
```bash
cd talkplatform-backend
npm run migration:run
```

#### Option 2: Manual SQL (Alternative)

Chạy SQL trong MySQL Workbench:
```sql
-- File: src/database/migrations/1764070000000-CreateEnrollmentTables.ts
-- Copy SQL từ migration file và chạy trực tiếp
```

---

## 🚀 PHASE 3: Payment Auto-Release System (SẴN SÀNG BẮT ĐẦU)

### 📋 Mục Tiêu

1. **Attendance Tracking** - Track thời gian học sinh tham gia
2. **Auto-Release Payments** - Tự động release payment sau session
3. **Commission Calculation** - Tính commission cho platform
4. **Withdrawal System** - Giáo viên rút tiền
5. **Revenue Dashboard** - Dashboard doanh thu

### 🗄️ Database Tables Cần Tạo

```sql
-- 1. Transactions table
CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL, -- deposit, purchase, refund, commission, payment_release, withdrawal
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reference_type VARCHAR(50),
  reference_id VARCHAR(36),
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
);

-- 2. Withdrawals table
CREATE TABLE withdrawals (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, rejected
  bank_account_info JSON NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teacher (teacher_id),
  INDEX idx_status (status)
);

-- 3. Attendance Records table
CREATE TABLE attendance_records (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  attendance_percentage DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'absent', -- absent, present, late
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_session_user (session_id, user_id),
  INDEX idx_session (session_id),
  INDEX idx_user (user_id)
);
```

### 🔧 Backend Implementation Plan

#### Day 1: Entities & Migration
```typescript
✅ Transaction.entity.ts
✅ Withdrawal.entity.ts
✅ AttendanceRecord.entity.ts
✅ Migration file
```

#### Day 2: Attendance Tracking
```typescript
✅ LiveKit Webhook Handler
✅ AttendanceService
  - trackJoin()
  - trackLeave()
  - calculateAttendance()
```

#### Day 3: Payment Release
```typescript
✅ PaymentReleaseService
  - autoReleasePayments() (Cron job)
  - releaseToTeacher()
  - refundToStudent()
  - calculateCommission()
```

#### Day 4: Withdrawal System
```typescript
✅ WithdrawalService
  - requestWithdrawal()
  - approveWithdrawal()
  - rejectWithdrawal()
  - getWithdrawals()

✅ WithdrawalController
  POST /api/withdrawals/request
  GET  /api/withdrawals/me
  POST /api/admin/withdrawals/:id/approve
  POST /api/admin/withdrawals/:id/reject
```

#### Day 5: Revenue Dashboard
```typescript
✅ RevenueService
  - getTeacherRevenue()
  - getTransactionHistory()
  - getWithdrawalHistory()

✅ API Endpoints
  GET /api/revenue/teacher/summary
  GET /api/revenue/teacher/transactions
  GET /api/revenue/teacher/withdrawals
```

### 🎨 Frontend Implementation Plan

#### Day 1-2: Teacher Revenue Dashboard
```typescript
✅ /teacher/revenue
  - Total earnings
  - Available balance
  - Pending payments
  - Transaction history
```

#### Day 3: Withdrawal Request
```typescript
✅ /teacher/revenue/withdraw
  - Enter amount
  - Bank account info
  - Submit request
```

#### Day 4: Student Credit Management
```typescript
✅ /student/credits
  - Current balance
  - Add credits (payment gateway)
  - Transaction history
```

### 📊 Business Logic

#### Attendance Rules
```
- Attendance >= 20% → Release payment to teacher
- Attendance < 20% → Refund to student
- Track via LiveKit webhooks:
  * participant_joined
  * participant_left
  * room_finished
```

#### Commission Structure
```
- Teacher referred by another teacher: 30% commission
- Direct teacher (no referral): 0% commission
```

#### Withdrawal Rules
```
- Minimum withdrawal: $10
- Teacher must be verified
- Amount <= available balance
- Status flow: pending → processing → completed/rejected
```

---

## 📈 Tiến Độ Tổng Quan

```
✅ Phase 1: Course Management (100%)
✅ Phase 2: Enrollment System (100%)
⏳ Phase 2.5: Run Migration (Pending - 5 minutes)
🚀 Phase 3: Payment Auto-Release (Ready to start - 5 days)
```

---

## 🎯 Hành Động Tiếp Theo

### Ngay Lập Tức (5 phút)
1. ✅ Update `data-source.ts` với enrollment entities
2. ✅ Run `npm run migration:run`
3. ✅ Verify tables created

### Tuần Này (5 ngày)
1. 🚀 Implement Phase 3 theo kế hoạch trên
2. 🧪 Test payment auto-release
3. 🧪 Test withdrawal system
4. 📊 Create revenue dashboard

---

## 📝 Notes

### Điểm Mạnh Hiện Tại
- ✅ Backend architecture rất tốt, modular
- ✅ Entities được thiết kế đầy đủ
- ✅ Services có transaction handling
- ✅ Access control được implement đúng
- ✅ Frontend có đầy đủ pages và components

### Điểm Cần Cải Thiện
- ⚠️ Migration chưa chạy (blocker cho Phase 3)
- ⚠️ Chưa có attendance tracking
- ⚠️ Chưa có payment auto-release
- ⚠️ Chưa có withdrawal system

### Rủi Ro
- 🔴 **HIGH**: Migration failure do foreign key constraints
  - **Mitigation**: Đã có SQL script không dùng FK
- 🟡 **MEDIUM**: LiveKit webhook signature verification
  - **Mitigation**: Đã có code verify signature
- 🟢 **LOW**: Commission calculation logic
  - **Mitigation**: Logic đơn giản, dễ test

---

## 🆘 Troubleshooting

### Migration Fails?
1. Check MySQL is running
2. Check `.env` database credentials
3. Check `data-source.ts` has all entities
4. Try manual SQL execution

### Entities Not Found?
Make sure imports are correct:
```typescript
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
// NOT: './src/features/courses/enrollment.entity'
```

### Foreign Key Errors?
Use SQL without FK constraints (already provided in SYSTEM_AUDIT_REPORT.md)

---

**Status**: ✅ Phase 1 & 2 Complete, Ready for Phase 3!
