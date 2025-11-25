# 4Talk Platform - Detailed Implementation Plan (Updated)

## 📋 Tổng quan hệ thống

Hệ thống có 2 loại phòng chính:
1. **Free Talk Rooms** - Phòng miễn phí, tối đa 4 người, tìm theo khu vực
2. **Paid Courses** - Khóa học trả phí, có thể mua theo buổi hoặc cả khóa

---

## 🏗️ Database Schema Overview

### Core Tables

```sql
-- Users table (đã có, cần bổ sung)
ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Courses table (Khóa học)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_hours INTEGER NOT NULL, -- Tổng thời lượng khóa học (giờ)
  total_sessions INTEGER NOT NULL, -- Tổng số buổi học
  price_type VARCHAR(20) NOT NULL, -- 'per_session' hoặc 'full_course'
  price_per_session DECIMAL(10,2), -- Giá mỗi buổi (nếu bán theo buổi)
  price_full_course DECIMAL(10,2), -- Giá cả khóa (nếu bán cả khóa)
  language VARCHAR(50),
  level VARCHAR(50),
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  max_students INTEGER DEFAULT 20,
  current_students INTEGER DEFAULT 0,
  affiliate_code VARCHAR(50) UNIQUE,
  qr_code_url TEXT,
  share_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_price CHECK (
    (price_type = 'per_session' AND price_per_session >= 1.00) OR
    (price_type = 'full_course' AND price_full_course >= 1.00)
  )
);

-- Course Sessions (Buổi học trong khóa)
CREATE TABLE course_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL, -- Buổi số mấy (1, 2, 3...)
  title VARCHAR(255),
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  livekit_room_name VARCHAR(255),
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  actual_duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, session_number)
);

-- Course Enrollments (Đăng ký khóa học)
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  enrollment_type VARCHAR(20) NOT NULL, -- 'full_course' hoặc 'per_session'
  total_price_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, completed
  enrolled_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0, -- % hoàn thành khóa học
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Session Purchases (Mua buổi học riêng lẻ)
CREATE TABLE session_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  session_id UUID NOT NULL REFERENCES course_sessions(id),
  price_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, attended, missed
  purchased_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  attended BOOLEAN DEFAULT FALSE,
  attendance_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- Free Talk Rooms (Phòng Free Talk)
CREATE TABLE free_talk_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id),
  room_name VARCHAR(255) NOT NULL,
  description TEXT,
  max_participants INTEGER DEFAULT 4,
  current_participants INTEGER DEFAULT 0,
  region VARCHAR(100),
  language VARCHAR(50),
  level VARCHAR(50),
  livekit_room_name VARCHAR(255) UNIQUE,
  qr_code_url TEXT,
  share_link TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, closed
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Free Talk Participants (Người tham gia Free Talk)
CREATE TABLE free_talk_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES free_talk_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  duration_minutes INTEGER,
  UNIQUE(room_id, user_id)
);

-- Transactions (Giao dịch tài chính)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- deposit, purchase_course, purchase_session, refund, withdrawal, commission
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
  reference_type VARCHAR(50), -- course, session, withdrawal
  reference_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Withdrawals (Rút tiền của giáo viên)
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, rejected
  bank_account_info JSONB,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT
);

-- Payment Holds (Giữ tiền khi học viên mua khóa)
CREATE TABLE payment_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES course_enrollments(id),
  session_purchase_id UUID REFERENCES session_purchases(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'held', -- held, released, refunded
  held_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  release_percentage DECIMAL(5,2) DEFAULT 0, -- % tiền được giải phóng
  notes TEXT
);

-- Reviews (Đánh giá giáo viên)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);
```

---

## 🎓 Phase 1: Course Management (Quản lý Khóa học)

### 1.1 Teacher - Tạo Khóa học

#### API Endpoints
```typescript
POST   /api/courses                    // Tạo khóa học mới
GET    /api/courses                    // Lấy danh sách khóa học (filter)
GET    /api/courses/:id                // Chi tiết khóa học
PATCH  /api/courses/:id                // Cập nhật khóa học
DELETE /api/courses/:id                // Xóa khóa học (chỉ khi chưa có học viên)
POST   /api/courses/:id/sessions       // Thêm buổi học vào khóa
GET    /api/courses/:id/sessions       // Lấy danh sách buổi học
PATCH  /api/courses/:id/sessions/:sid  // Cập nhật buổi học
DELETE /api/courses/:id/sessions/:sid  // Xóa buổi học
GET    /api/courses/:id/qr-code        // Generate QR code
GET    /api/courses/:id/share-link     // Generate share link
```

#### Business Logic

**Tạo khóa học**:
```typescript
async createCourse(teacherId: string, dto: CreateCourseDto) {
  // 1. Validate teacher
  const teacher = await this.userRepository.findOne({
    where: { id: teacherId, role: 'teacher', is_verified: true }
  });
  if (!teacher) throw new Error('Only verified teachers can create courses');
  
  // 2. Validate pricing
  if (dto.price_type === 'per_session' && dto.price_per_session < 1) {
    throw new Error('Price per session must be at least $1');
  }
  if (dto.price_type === 'full_course' && dto.price_full_course < 1) {
    throw new Error('Full course price must be at least $1');
  }
  
  // 3. Create course
  const course = await this.courseRepository.save({
    teacher_id: teacherId,
    ...dto,
    affiliate_code: `COURSE_${generateCode()}`,
    share_link: `${process.env.FRONTEND_URL}/courses/${courseId}`,
  });
  
  // 4. Generate QR code
  const qrCodeUrl = await this.qrService.generate(course.share_link);
  await this.courseRepository.update(course.id, { qr_code_url: qrCodeUrl });
  
  return course;
}
```

**Thêm buổi học**:
```typescript
async addSession(courseId: string, dto: CreateSessionDto) {
  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  
  // Validate session number
  const existingSession = await this.sessionRepository.findOne({
    where: { course_id: courseId, session_number: dto.session_number }
  });
  if (existingSession) throw new Error('Session number already exists');
  
  // Create session
  const session = await this.sessionRepository.save({
    course_id: courseId,
    ...dto,
    livekit_room_name: `course_${courseId}_session_${dto.session_number}`,
  });
  
  return session;
}
```

### 1.2 Teacher Dashboard

#### Quản lý các khóa học
```typescript
GET /api/teachers/me/courses?status=upcoming    // Các khóa sắp diễn ra
GET /api/teachers/me/courses?status=ongoing     // Các khóa đang diễn ra
GET /api/teachers/me/courses?status=completed   // Các khóa đã kết thúc
```

#### Quản lý Doanh thu
```typescript
GET /api/teachers/me/revenue/total              // Tổng doanh thu
GET /api/teachers/me/revenue/by-course/:id      // Doanh thu theo khóa
GET /api/teachers/me/revenue/by-session/:id     // Doanh thu theo buổi
GET /api/teachers/me/revenue/refunds            // Tiền refund
```

**Revenue Calculation**:
```typescript
async getTeacherRevenue(teacherId: string) {
  // Tổng doanh thu = Tổng tiền đã nhận - Tiền refund
  const totalEarnings = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.user_id = :teacherId', { teacherId })
    .andWhere('t.type IN (:...types)', { types: ['commission', 'session_payment'] })
    .andWhere('t.status = :status', { status: 'completed' })
    .getRawOne();
  
  const totalRefunds = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.user_id = :teacherId', { teacherId })
    .andWhere('t.type = :type', { type: 'refund' })
    .getRawOne();
  
  const totalWithdrawals = await this.withdrawalRepository
    .createQueryBuilder('w')
    .select('SUM(w.amount)', 'total')
    .where('w.teacher_id = :teacherId', { teacherId })
    .andWhere('w.status = :status', { status: 'completed' })
    .getRawOne();
  
  const availableBalance = totalEarnings.total - totalRefunds.total - totalWithdrawals.total;
  
  return {
    total_earnings: totalEarnings.total || 0,
    total_refunds: totalRefunds.total || 0,
    total_withdrawals: totalWithdrawals.total || 0,
    available_balance: availableBalance || 0,
  };
}
```

#### Quản lý Thanh toán (Rút tiền)
```typescript
POST /api/teachers/me/withdrawals              // Yêu cầu rút tiền
GET  /api/teachers/me/withdrawals              // Lịch sử rút tiền
GET  /api/teachers/me/withdrawals/:id          // Chi tiết yêu cầu rút tiền
```

**Withdrawal Logic**:
```typescript
async requestWithdrawal(teacherId: string, amount: number, bankInfo: any) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Check available balance
    const teacher = await manager.findOne(User, { where: { id: teacherId } });
    if (teacher.available_balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // 2. Create withdrawal request
    const withdrawal = await manager.save(Withdrawal, {
      teacher_id: teacherId,
      amount,
      bank_account_info: bankInfo,
      status: 'pending',
    });
    
    // 3. Deduct from available balance
    await manager.update(User, teacherId, {
      available_balance: () => `available_balance - ${amount}`,
    });
    
    // 4. Create transaction record
    await manager.save(Transaction, {
      user_id: teacherId,
      type: 'withdrawal',
      amount: -amount,
      balance_before: teacher.available_balance,
      balance_after: teacher.available_balance - amount,
      reference_type: 'withdrawal',
      reference_id: withdrawal.id,
      status: 'pending',
    });
    
    return withdrawal;
  });
}
```

---

## 🎓 Phase 2: Student Enrollment (Học viên đăng ký)

### 2.1 Mua theo buổi học

#### API Endpoints
```typescript
POST /api/courses/:id/sessions/:sid/purchase   // Mua 1 buổi học
POST /api/courses/:id/sessions/:sid/cancel     // Hủy buổi học đã mua
```

#### Purchase Logic
```typescript
async purchaseSession(userId: string, sessionId: string) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Get session and course info
    const session = await manager.findOne(CourseSession, {
      where: { id: sessionId },
      relations: ['course', 'course.teacher']
    });
    
    const course = session.course;
    const price = course.price_per_session;
    
    // 2. Check if already purchased
    const existing = await manager.findOne(SessionPurchase, {
      where: { user_id: userId, session_id: sessionId }
    });
    if (existing) throw new Error('Already purchased this session');
    
    // 3. Check user credit
    const user = await manager.findOne(User, { where: { id: userId } });
    if (user.credit_balance < price) throw new Error('Insufficient credit');
    
    // 4. Deduct credit from student
    await manager.update(User, userId, {
      credit_balance: () => `credit_balance - ${price}`,
    });
    
    // 5. Create purchase record
    const purchase = await manager.save(SessionPurchase, {
      user_id: userId,
      course_id: course.id,
      session_id: sessionId,
      price_paid: price,
      payment_status: 'paid',
      status: 'active',
    });
    
    // 6. Hold payment (giữ tiền)
    await manager.save(PaymentHold, {
      session_purchase_id: purchase.id,
      teacher_id: course.teacher_id,
      student_id: userId,
      amount: price,
      status: 'held',
    });
    
    // 7. Create transaction
    await manager.save(Transaction, {
      user_id: userId,
      type: 'purchase_session',
      amount: -price,
      balance_before: user.credit_balance,
      balance_after: user.credit_balance - price,
      reference_type: 'session',
      reference_id: purchase.id,
      status: 'completed',
    });
    
    // 8. Send notification to teacher
    await this.notificationService.sendToTeacher(course.teacher_id, {
      type: 'new_session_purchase',
      student_name: user.username,
      session_title: session.title,
      amount: price,
    });
    
    return purchase;
  });
}
```

### 2.2 Mua cả khóa học

#### API Endpoints
```typescript
POST /api/courses/:id/enroll                   // Mua cả khóa học
POST /api/courses/:id/cancel                   // Hủy khóa học
```

#### Enrollment Logic
```typescript
async enrollFullCourse(userId: string, courseId: string) {
  return await this.dataSource.transaction(async (manager) => {
    const course = await manager.findOne(Course, {
      where: { id: courseId },
      relations: ['teacher']
    });
    
    const price = course.price_full_course;
    
    // Check if already enrolled
    const existing = await manager.findOne(CourseEnrollment, {
      where: { user_id: userId, course_id: courseId }
    });
    if (existing) throw new Error('Already enrolled in this course');
    
    // Check credit
    const user = await manager.findOne(User, { where: { id: userId } });
    if (user.credit_balance < price) throw new Error('Insufficient credit');
    
    // Deduct credit
    await manager.update(User, userId, {
      credit_balance: () => `credit_balance - ${price}`,
    });
    
    // Create enrollment
    const enrollment = await manager.save(CourseEnrollment, {
      user_id: userId,
      course_id: courseId,
      enrollment_type: 'full_course',
      total_price_paid: price,
      payment_status: 'paid',
      status: 'active',
    });
    
    // Hold payment
    await manager.save(PaymentHold, {
      enrollment_id: enrollment.id,
      teacher_id: course.teacher_id,
      student_id: userId,
      amount: price,
      status: 'held',
    });
    
    // Update course student count
    await manager.update(Course, courseId, {
      current_students: () => 'current_students + 1',
    });
    
    // Transaction record
    await manager.save(Transaction, {
      user_id: userId,
      type: 'purchase_course',
      amount: -price,
      balance_before: user.credit_balance,
      balance_after: user.credit_balance - price,
      reference_type: 'course',
      reference_id: enrollment.id,
      status: 'completed',
    });
    
    // Notify teacher
    await this.notificationService.sendToTeacher(course.teacher_id, {
      type: 'new_course_enrollment',
      student_name: user.username,
      course_title: course.title,
      amount: price,
    });
    
    return enrollment;
  });
}
```

---

## 💰 Phase 3: Payment Gateway & Auto-Release

### 3.1 Payment Hold System

**Quy tắc giải phóng tiền**:
- Khi học viên học xong buổi học
- Check thời gian học: Nếu >= 20% thời lượng buổi học → Tự động thanh toán cho giáo viên
- Nếu < 20% → Refund cho học viên

#### Auto-Release Logic
```typescript
@Cron('*/5 * * * *') // Chạy mỗi 5 phút
async autoReleasePayments() {
  // Find all completed sessions
  const completedSessions = await this.sessionRepository.find({
    where: { status: 'completed' },
    relations: ['course', 'course.teacher']
  });
  
  for (const session of completedSessions) {
    // Find all purchases for this session
    const purchases = await this.sessionPurchaseRepository.find({
      where: { session_id: session.id, status: 'attended' }
    });
    
    for (const purchase of purchases) {
      // Check if payment already released
      const hold = await this.paymentHoldRepository.findOne({
        where: { session_purchase_id: purchase.id, status: 'held' }
      });
      
      if (!hold) continue;
      
      // Calculate attendance percentage
      const attendancePercentage = (purchase.attendance_duration_minutes / session.duration_minutes) * 100;
      
      if (attendancePercentage >= 20) {
        // Release payment to teacher
        await this.releasePaymentToTeacher(hold, attendancePercentage);
      } else {
        // Refund to student
        await this.refundToStudent(hold, purchase);
      }
    }
  }
}

async releasePaymentToTeacher(hold: PaymentHold, attendancePercentage: number) {
  return await this.dataSource.transaction(async (manager) => {
    // Calculate commission (70% if referred, 30% if platform)
    const student = await manager.findOne(User, { where: { id: hold.student_id } });
    const teacher = await manager.findOne(User, { where: { id: hold.teacher_id } });
    
    let teacherShare: number;
    if (student.referred_by === teacher.id) {
      teacherShare = hold.amount * 0.70;
    } else {
      teacherShare = hold.amount * 0.30;
    }
    
    // Add to teacher available balance
    await manager.update(User, hold.teacher_id, {
      available_balance: () => `available_balance + ${teacherShare}`,
      total_earnings: () => `total_earnings + ${teacherShare}`,
    });
    
    // Update hold status
    await manager.update(PaymentHold, hold.id, {
      status: 'released',
      released_at: new Date(),
      release_percentage: attendancePercentage,
    });
    
    // Create transaction
    await manager.save(Transaction, {
      user_id: hold.teacher_id,
      type: 'commission',
      amount: teacherShare,
      balance_before: teacher.available_balance,
      balance_after: teacher.available_balance + teacherShare,
      reference_type: 'payment_hold',
      reference_id: hold.id,
      status: 'completed',
      description: `Payment released - ${attendancePercentage.toFixed(2)}% attendance`,
    });
  });
}

async refundToStudent(hold: PaymentHold, purchase: SessionPurchase) {
  return await this.dataSource.transaction(async (manager) => {
    const student = await manager.findOne(User, { where: { id: hold.student_id } });
    
    // Refund to student
    await manager.update(User, hold.student_id, {
      credit_balance: () => `credit_balance + ${hold.amount}`,
    });
    
    // Update hold
    await manager.update(PaymentHold, hold.id, {
      status: 'refunded',
      released_at: new Date(),
    });
    
    // Update purchase
    await manager.update(SessionPurchase, purchase.id, {
      status: 'cancelled',
      refund_amount: hold.amount,
    });
    
    // Transaction
    await manager.save(Transaction, {
      user_id: hold.student_id,
      type: 'refund',
      amount: hold.amount,
      balance_before: student.credit_balance,
      balance_after: student.credit_balance + hold.amount,
      reference_type: 'session_purchase',
      reference_id: purchase.id,
      status: 'completed',
      description: 'Refund - attendance < 20%',
    });
  });
}
```

### 3.2 Attendance Tracking

**Track attendance during LiveKit session**:
```typescript
// In LiveKit webhook handler
@Post('webhooks/livekit')
async handleLivekitWebhook(@Body() event: any) {
  if (event.event === 'participant_joined') {
    await this.trackParticipantJoin(event);
  } else if (event.event === 'participant_left') {
    await this.trackParticipantLeave(event);
  }
}

async trackParticipantJoin(event: any) {
  const { room_name, participant } = event;
  
  // Parse room name to get session info
  // Format: course_{courseId}_session_{sessionNumber}
  const match = room_name.match(/course_(.+)_session_(\d+)/);
  if (!match) return;
  
  const [, courseId, sessionNumber] = match;
  
  // Find session
  const session = await this.sessionRepository.findOne({
    where: { course_id: courseId, session_number: parseInt(sessionNumber) }
  });
  
  // Find purchase
  const purchase = await this.sessionPurchaseRepository.findOne({
    where: { 
      session_id: session.id,
      user_id: participant.identity // userId stored in participant identity
    }
  });
  
  if (purchase) {
    // Mark as attended and record join time
    await this.sessionPurchaseRepository.update(purchase.id, {
      attended: true,
      status: 'attended',
    });
    
    // Store join time in metadata
    await this.redis.set(
      `attendance:${purchase.id}:join`,
      new Date().toISOString()
    );
  }
}

async trackParticipantLeave(event: any) {
  const { room_name, participant } = event;
  
  const match = room_name.match(/course_(.+)_session_(\d+)/);
  if (!match) return;
  
  const [, courseId, sessionNumber] = match;
  
  const session = await this.sessionRepository.findOne({
    where: { course_id: courseId, session_number: parseInt(sessionNumber) }
  });
  
  const purchase = await this.sessionPurchaseRepository.findOne({
    where: { 
      session_id: session.id,
      user_id: participant.identity
    }
  });
  
  if (purchase) {
    // Calculate duration
    const joinTime = await this.redis.get(`attendance:${purchase.id}:join`);
    if (joinTime) {
      const duration = Math.floor(
        (new Date().getTime() - new Date(joinTime).getTime()) / (1000 * 60)
      );
      
      await this.sessionPurchaseRepository.update(purchase.id, {
        attendance_duration_minutes: duration,
      });
      
      await this.redis.del(`attendance:${purchase.id}:join`);
    }
  }
}
```

---

## 🎯 Phase 4: Free Talk Rooms

### 4.1 Tạo phòng Free Talk

#### API Endpoints
```typescript
POST /api/free-talk/rooms                      // Tạo phòng mới
GET  /api/free-talk/rooms                      // Lấy danh sách phòng (filter by region)
GET  /api/free-talk/rooms/:id                  // Chi tiết phòng
POST /api/free-talk/rooms/:id/join             // Join phòng
POST /api/free-talk/rooms/:id/leave            // Leave phòng
GET  /api/free-talk/nearby                     // Tìm phòng gần (GeoIP)
```

#### Create Room Logic
```typescript
async createFreeTalkRoom(userId: string, dto: CreateFreeTalkRoomDto) {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  // Create room
  const room = await this.freeTalkRoomRepository.save({
    host_id: userId,
    room_name: dto.room_name,
    description: dto.description,
    max_participants: 4, // Fixed max 4 people
    region: user.region,
    language: dto.language,
    level: dto.level,
    livekit_room_name: `freetalk_${generateRoomId()}`,
    share_link: `${process.env.FRONTEND_URL}/free-talk/${roomId}`,
    status: 'active',
  });
  
  // Generate QR code
  const qrCodeUrl = await this.qrService.generate(room.share_link);
  await this.freeTalkRoomRepository.update(room.id, { qr_code_url: qrCodeUrl });
  
  // Auto-join host
  await this.joinRoom(userId, room.id);
  
  return room;
}
```

#### Find Nearby Rooms (GeoIP)
```typescript
async findNearbyRooms(userIp: string) {
  // Get user location from IP
  const location = this.geoIpService.getLocation(userIp);
  
  // Find active rooms in same region
  const rooms = await this.freeTalkRoomRepository.find({
    where: {
      status: 'active',
      region: location.country,
      current_participants: LessThan(4), // Not full
    },
    order: { created_at: 'DESC' },
    take: 20,
  });
  
  return rooms;
}
```

#### Auto-close Room Logic
```typescript
// Socket event when user disconnects
@SubscribeMessage('leave-room')
async handleLeaveRoom(client: Socket, roomId: string) {
  const userId = client.data.userId;
  
  // Update participant
  await this.participantRepository.update(
    { room_id: roomId, user_id: userId, left_at: null },
    { left_at: new Date() }
  );
  
  // Update room participant count
  await this.freeTalkRoomRepository.decrement(
    { id: roomId },
    'current_participants',
    1
  );
  
  // Check if room is empty
  const room = await this.freeTalkRoomRepository.findOne({
    where: { id: roomId }
  });
  
  if (room.current_participants === 0) {
    // Close room
    await this.freeTalkRoomRepository.update(roomId, {
      status: 'closed',
      closed_at: new Date(),
    });
    
    // Delete LiveKit room
    await this.livekitService.deleteRoom(room.livekit_room_name);
  }
}
```

---

## 📊 Phase 5: CMS & Admin

### 5.1 Admin Dashboard

#### API Endpoints
```typescript
GET  /api/admin/courses                        // Quản lý tất cả khóa học
GET  /api/admin/enrollments                    // Quản lý đăng ký
GET  /api/admin/transactions                   // Quản lý giao dịch
GET  /api/admin/withdrawals                    // Quản lý yêu cầu rút tiền
POST /api/admin/withdrawals/:id/approve        // Duyệt rút tiền
POST /api/admin/withdrawals/:id/reject         // Từ chối rút tiền
GET  /api/admin/revenue                        // Thống kê doanh thu
```

### 5.2 Revenue Statistics
```typescript
async getAdminRevenue() {
  // Platform revenue = 70% of non-referred students + 30% of referred students
  const totalRevenue = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.type IN (:...types)', { types: ['purchase_course', 'purchase_session'] })
    .andWhere('t.status = :status', { status: 'completed' })
    .getRawOne();
  
  const teacherPayouts = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.type = :type', { type: 'commission' })
    .andWhere('t.status = :status', { status: 'completed' })
    .getRawOne();
  
  const platformRevenue = totalRevenue.total - teacherPayouts.total;
  
  return {
    total_revenue: totalRevenue.total || 0,
    teacher_payouts: teacherPayouts.total || 0,
    platform_revenue: platformRevenue || 0,
  };
}
```

---

## 🔔 Phase 6: Notifications

### 6.1 Notification Types

```typescript
// Teacher notifications
- new_session_purchase: Học viên mua buổi học
- new_course_enrollment: Học viên đăng ký khóa học
- session_cancelled: Học viên hủy buổi học
- withdrawal_approved: Yêu cầu rút tiền được duyệt
- payment_released: Tiền được giải phóng sau buổi học

// Student notifications
- session_reminder: Nhắc nhở buổi học sắp diễn ra (1 giờ trước)
- session_started: Buổi học đã bắt đầu
- refund_processed: Tiền được hoàn lại
- course_updated: Khóa học có cập nhật
```

---

## 📱 Frontend Components Structure

```
talkplatform-frontend/
├── app/
│   ├── courses/
│   │   ├── page.tsx                    # Browse courses
│   │   ├── [id]/
│   │   │   ├── page.tsx                # Course detail
│   │   │   └── sessions/
│   │   │       └── [sid]/page.tsx      # Session detail
│   │   └── create/page.tsx             # Create course (teacher)
│   ├── my-courses/
│   │   ├── page.tsx                    # Student: My enrollments
│   │   └── teaching/page.tsx           # Teacher: My courses
│   ├── free-talk/
│   │   ├── page.tsx                    # Browse free talk rooms
│   │   ├── [id]/page.tsx               # Join room
│   │   └── create/page.tsx             # Create room
│   ├── revenue/
│   │   └── page.tsx                    # Teacher revenue dashboard
│   └── withdrawals/
│       └── page.tsx                    # Teacher withdrawals
├── components/
│   ├── courses/
│   │   ├── CourseCard.tsx
│   │   ├── CourseList.tsx
│   │   ├── CreateCourseForm.tsx
│   │   ├── SessionScheduler.tsx
│   │   └── EnrollButton.tsx
│   ├── free-talk/
│   │   ├── RoomCard.tsx
│   │   ├── RoomList.tsx
│   │   ├── CreateRoomForm.tsx
│   │   └── NearbyRooms.tsx
│   ├── revenue/
│   │   ├── RevenueChart.tsx
│   │   ├── TransactionHistory.tsx
│   │   └── WithdrawalForm.tsx
│   └── payment/
│       ├── PaymentModal.tsx
│       └── RefundStatus.tsx
└── api/
    ├── courses.rest.ts
    ├── enrollments.rest.ts
    ├── free-talk.rest.ts
    ├── revenue.rest.ts
    └── withdrawals.rest.ts
```

---

## 🧪 Testing Scenarios

### Course Purchase Flow
1. Student browses courses
2. Student clicks "Buy Session" or "Buy Full Course"
3. System checks credit balance
4. Payment is deducted and held
5. Student receives confirmation
6. Teacher receives notification

### Attendance & Auto-Release
1. Student joins LiveKit session
2. System tracks join time
3. Student leaves session
4. System calculates duration
5. If >= 20%: Release payment to teacher
6. If < 20%: Refund to student

### Free Talk Room
1. User creates room (max 4 people)
2. Generate QR code and share link
3. Other users join via link
4. Last user leaves
5. Room auto-closes

---

## 🚀 Implementation Timeline

**Week 1-2**: Course Management
- Database migrations
- Backend API (courses, sessions)
- Frontend UI (create course, schedule sessions)

**Week 3-4**: Enrollment System
- Purchase flow (session & full course)
- Payment hold system
- Student dashboard

**Week 5-6**: Payment Gateway
- Auto-release logic
- Attendance tracking
- Refund system

**Week 7-8**: Teacher Revenue
- Revenue dashboard
- Withdrawal system
- Transaction history

**Week 9-10**: Free Talk Rooms
- Room creation
- GeoIP matching
- Auto-close logic

**Week 11-12**: Admin & Polish
- Admin dashboard
- Notifications
- Testing & bug fixes

---

**Ready to start implementation? Let me know which phase you want to begin with!** 🚀
