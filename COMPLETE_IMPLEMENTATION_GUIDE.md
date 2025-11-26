# 📚 4Talk Platform - Complete Implementation Guide

**Version**: 2.0  
**Last Updated**: 2025-11-26  
**Status**: Phase 1 & 2 Complete, Phase 3 & 4 Pending

---

## 📑 Table of Contents

1. [Phase 1: Course Management System](#phase-1-course-management-system)
2. [Phase 2: Student Enrollment & Payment Hold](#phase-2-student-enrollment--payment-hold)
3. [Phase 3: Payment Auto-Release & Commission](#phase-3-payment-auto-release--commission)
4. [Phase 4: Free Talk Rooms](#phase-4-free-talk-rooms)
5. [Phase 5: Advanced Features](#phase-5-advanced-features)

---

# Phase 1: Course Management System

## 📋 Overview

**Purpose**: Allow teachers to create and manage courses with multiple sessions. Students can browse courses but cannot enroll yet (enrollment is Phase 2).

**Status**: ✅ **COMPLETE**

---

## 🗄️ Database Entities

### 1. Course Entity

**Table**: `courses`

**Purpose**: Store course information created by teachers

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  teacher_id: string (UUID, FOREIGN KEY → users.id)
  title: string (VARCHAR 255, NOT NULL)
  description: string (TEXT, NULLABLE)
  category: string (VARCHAR 100, NULLABLE)
  level: string (VARCHAR 50, NULLABLE) // beginner, intermediate, advanced
  language: string (VARCHAR 50, NULLABLE)
  
  // Pricing
  price_full_course: number (DECIMAL 10,2, NULLABLE)
  price_per_session: number (DECIMAL 10,2, NULLABLE)
  
  // Capacity
  max_students: number (INT, DEFAULT 30)
  current_students: number (INT, DEFAULT 0)
  
  // Metadata
  duration_hours: number (INT, NULLABLE)
  total_sessions: number (INT, DEFAULT 0)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'draft') // draft, published, archived
  is_published: boolean (DEFAULT false)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_teacher` on `teacher_id`
- `idx_category` on `category`
- `idx_status` on `status`
- `idx_published` on `is_published`

**Relations**:
- `teacher`: ManyToOne → User (teacher who created the course)
- `sessions`: OneToMany → CourseSession
- `enrollments`: OneToMany → CourseEnrollment (Phase 2)

---

### 2. CourseSession Entity

**Table**: `course_sessions`

**Purpose**: Individual sessions within a course

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  course_id: string (UUID, FOREIGN KEY → courses.id)
  
  // Session Info
  session_number: number (INT, NOT NULL)
  title: string (VARCHAR 255, NOT NULL)
  description: string (TEXT, NULLABLE)
  
  // Schedule
  scheduled_date: date (DATE, NOT NULL)
  start_time: string (VARCHAR 10, NOT NULL) // "14:00"
  end_time: string (VARCHAR 10, NOT NULL) // "16:00"
  duration_minutes: number (INT, NOT NULL)
  
  // Meeting
  meeting_link: string (VARCHAR 500, NULLABLE)
  meeting_id: string (VARCHAR 100, NULLABLE)
  livekit_room_name: string (VARCHAR 255, NULLABLE)
  
  // QR Code
  qr_code_url: string (VARCHAR 500, NULLABLE)
  qr_code_data: string (TEXT, NULLABLE)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'scheduled') // scheduled, ongoing, completed, cancelled
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_course` on `course_id`
- `idx_scheduled_date` on `scheduled_date`
- `idx_status` on `status`

**Relations**:
- `course`: ManyToOne → Course
- `purchases`: OneToMany → SessionPurchase (Phase 2)

---

## 🔄 Business Logic Flows

### Flow 1: Create Course

**Endpoint**: `POST /api/courses`

**Request**:
```json
{
  "title": "English Conversation for Beginners",
  "description": "Learn basic English conversation skills",
  "category": "Language",
  "level": "beginner",
  "language": "English",
  "price_full_course": 100,
  "price_per_session": 12,
  "max_students": 30,
  "duration_hours": 20,
  "total_sessions": 10
}
```

**Process**:
1. Validate user is a teacher
2. Validate required fields
3. Create course with `status = 'draft'`
4. Set `current_students = 0`
5. Set `is_published = false`
6. Return created course

**Response**:
```json
{
  "id": "uuid",
  "teacher_id": "uuid",
  "title": "English Conversation for Beginners",
  "status": "draft",
  "created_at": "2025-11-26T10:00:00Z"
}
```

---

### Flow 2: Add Session to Course

**Endpoint**: `POST /api/courses/:courseId/sessions`

**Request**:
```json
{
  "session_number": 1,
  "title": "Introduction & Greetings",
  "description": "Learn basic greetings and introductions",
  "scheduled_date": "2025-12-01",
  "start_time": "14:00",
  "end_time": "16:00",
  "duration_minutes": 120
}
```

**Process**:
1. Validate course exists
2. Validate user owns the course
3. Generate LiveKit room name: `course_{courseId}_session_{sessionNumber}`
4. Generate QR code with session info
5. Create session
6. Increment `course.total_sessions`
7. Return created session

**Response**:
```json
{
  "id": "uuid",
  "course_id": "uuid",
  "session_number": 1,
  "title": "Introduction & Greetings",
  "livekit_room_name": "course_abc123_session_1",
  "qr_code_url": "/uploads/qr/session_xyz.png",
  "status": "scheduled"
}
```

---

### Flow 3: Publish Course

**Endpoint**: `PATCH /api/courses/:id/publish`

**Process**:
1. Validate course has at least 1 session
2. Validate pricing is set
3. Set `is_published = true`
4. Set `status = 'published'`
5. Return updated course

**Response**:
```json
{
  "id": "uuid",
  "status": "published",
  "is_published": true
}
```

---

### Flow 4: Browse Courses (Public)

**Endpoint**: `GET /api/courses`

**Query Parameters**:
```
?page=1
&limit=20
&category=Language
&level=beginner
&search=English
&sortBy=created_at
&sortOrder=DESC
```

**Process**:
1. Filter by `is_published = true`
2. Apply category filter (if provided)
3. Apply level filter (if provided)
4. Apply search on title/description (if provided)
5. Sort by specified field
6. Paginate results
7. Return courses with teacher info

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "English Conversation",
      "description": "...",
      "category": "Language",
      "level": "beginner",
      "price_full_course": 100,
      "price_per_session": 12,
      "max_students": 30,
      "current_students": 5,
      "total_sessions": 10,
      "teacher": {
        "id": "uuid",
        "username": "john_teacher",
        "email": "john@example.com"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### Flow 5: Get Course Details

**Endpoint**: `GET /api/courses/:id`

**Process**:
1. Find course by ID
2. Load teacher info
3. Load all sessions (ordered by session_number)
4. Return full course details

**Response**:
```json
{
  "id": "uuid",
  "title": "English Conversation",
  "description": "...",
  "category": "Language",
  "level": "beginner",
  "price_full_course": 100,
  "price_per_session": 12,
  "max_students": 30,
  "current_students": 5,
  "total_sessions": 10,
  "duration_hours": 20,
  "teacher": {
    "id": "uuid",
    "username": "john_teacher",
    "email": "john@example.com",
    "avatar_url": "..."
  },
  "sessions": [
    {
      "id": "uuid",
      "session_number": 1,
      "title": "Introduction & Greetings",
      "scheduled_date": "2025-12-01",
      "start_time": "14:00",
      "end_time": "16:00",
      "duration_minutes": 120,
      "status": "scheduled"
    }
  ]
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/courses` | Create course | ✅ | Teacher |
| GET | `/api/courses` | List courses | ❌ | Public |
| GET | `/api/courses/:id` | Get course details | ❌ | Public |
| PATCH | `/api/courses/:id` | Update course | ✅ | Teacher (owner) |
| DELETE | `/api/courses/:id` | Delete course | ✅ | Teacher (owner) |
| PATCH | `/api/courses/:id/publish` | Publish course | ✅ | Teacher (owner) |
| POST | `/api/courses/:id/sessions` | Add session | ✅ | Teacher (owner) |
| GET | `/api/courses/:id/sessions` | List sessions | ❌ | Public |
| PATCH | `/api/courses/:id/sessions/:sid` | Update session | ✅ | Teacher (owner) |
| DELETE | `/api/courses/:id/sessions/:sid` | Delete session | ✅ | Teacher (owner) |

---

# Phase 2: Student Enrollment & Payment Hold

## 📋 Overview

**Purpose**: Allow students to enroll in courses (full course or per session). Payments are held in escrow until session completion.

**Status**: ✅ **COMPLETE**

---

## 🗄️ Database Entities

### 1. CourseEnrollment Entity

**Table**: `course_enrollments`

**Purpose**: Track full course enrollments

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  user_id: string (UUID, FOREIGN KEY → users.id)
  course_id: string (UUID, FOREIGN KEY → courses.id)
  
  // Enrollment Type
  enrollment_type: string (VARCHAR 20, NOT NULL) // 'full_course' or 'per_session'
  
  // Payment
  total_price_paid: number (DECIMAL 10,2, NOT NULL)
  payment_status: string (VARCHAR 50, DEFAULT 'pending') // pending, paid, refunded
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'active') // active, cancelled, completed
  
  // Progress
  completion_percentage: number (DECIMAL 5,2, DEFAULT 0)
  
  // Dates
  enrolled_at: timestamp (DEFAULT CURRENT_TIMESTAMP)
  cancelled_at: timestamp (NULLABLE)
  
  // Refund
  refund_amount: number (DECIMAL 10,2, DEFAULT 0)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_user` on `user_id`
- `idx_course` on `course_id`
- `idx_status` on `status`
- `unique_user_course` on `(user_id, course_id)`

**Relations**:
- `user`: ManyToOne → User (student)
- `course`: ManyToOne → Course
- `paymentHolds`: OneToMany → PaymentHold

---

### 2. SessionPurchase Entity

**Table**: `session_purchases`

**Purpose**: Track individual session purchases

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  user_id: string (UUID, FOREIGN KEY → users.id)
  course_id: string (UUID, FOREIGN KEY → courses.id)
  session_id: string (UUID, FOREIGN KEY → course_sessions.id)
  
  // Payment
  price_paid: number (DECIMAL 10,2, NOT NULL)
  payment_status: string (VARCHAR 50, DEFAULT 'pending')
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'active') // active, cancelled, attended, missed
  
  // Attendance
  attended: boolean (DEFAULT false)
  attendance_duration_minutes: number (INT, DEFAULT 0)
  
  // Dates
  purchased_at: timestamp (DEFAULT CURRENT_TIMESTAMP)
  cancelled_at: timestamp (NULLABLE)
  
  // Refund
  refund_amount: number (DECIMAL 10,2, DEFAULT 0)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_user` on `user_id`
- `idx_session` on `session_id`
- `idx_status` on `status`
- `unique_user_session` on `(user_id, session_id)`

**Relations**:
- `user`: ManyToOne → User (student)
- `course`: ManyToOne → Course
- `session`: ManyToOne → CourseSession
- `paymentHolds`: OneToMany → PaymentHold

---

### 3. PaymentHold Entity

**Table**: `payment_holds`

**Purpose**: Hold payments in escrow until session completion

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  
  // Reference (one of these will be set)
  enrollment_id: string (UUID, NULLABLE, FOREIGN KEY → course_enrollments.id)
  session_purchase_id: string (UUID, NULLABLE, FOREIGN KEY → session_purchases.id)
  
  // Parties
  teacher_id: string (UUID, NOT NULL, FOREIGN KEY → users.id)
  student_id: string (UUID, NOT NULL, FOREIGN KEY → users.id)
  
  // Amount
  amount: number (DECIMAL 10,2, NOT NULL)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'held') // held, released, refunded
  
  // Release Info
  release_percentage: number (DECIMAL 5,2, DEFAULT 0) // % of payment to release
  
  // Dates
  held_at: timestamp (DEFAULT CURRENT_TIMESTAMP)
  released_at: timestamp (NULLABLE)
  
  // Notes
  notes: string (TEXT, NULLABLE)
  
  // Timestamps
  created_at: timestamp
}
```

**Indexes**:
- `idx_teacher` on `teacher_id`
- `idx_student` on `student_id`
- `idx_status` on `status`

**Relations**:
- `teacher`: ManyToOne → User
- `student`: ManyToOne → User
- `enrollment`: ManyToOne → CourseEnrollment (nullable)
- `sessionPurchase`: ManyToOne → SessionPurchase (nullable)

---

## 🔄 Business Logic Flows

### Flow 1: Enroll in Full Course

**Endpoint**: `POST /api/enrollments/courses/:courseId`

**Request**:
```json
{
  "enrollment_type": "full_course"
}
```

**Process**:
1. **Validate Course**:
   - Course exists
   - Course is published
   - Course has available slots (`current_students < max_students`)

2. **Check Existing Enrollment**:
   - User not already enrolled in this course
   - Return error if duplicate

3. **Check Credit Balance**:
   - Get `course.price_full_course`
   - Check `user.credit_balance >= price`
   - Return error if insufficient

4. **Deduct Credit**:
   ```sql
   UPDATE users 
   SET credit_balance = credit_balance - price 
   WHERE id = user_id
   ```

5. **Create Enrollment**:
   ```typescript
   {
     user_id: userId,
     course_id: courseId,
     enrollment_type: 'full_course',
     total_price_paid: price,
     payment_status: 'paid',
     status: 'active'
   }
   ```

6. **Create Payment Hold**:
   ```typescript
   {
     enrollment_id: enrollment.id,
     teacher_id: course.teacher_id,
     student_id: userId,
     amount: price,
     status: 'held'
   }
   ```

7. **Update Course**:
   ```sql
   UPDATE courses 
   SET current_students = current_students + 1 
   WHERE id = courseId
   ```

8. **Return Enrollment**

**Response**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "course_id": "uuid",
  "enrollment_type": "full_course",
  "total_price_paid": 100,
  "payment_status": "paid",
  "status": "active",
  "enrolled_at": "2025-11-26T10:00:00Z",
  "course": {
    "id": "uuid",
    "title": "English Conversation",
    "total_sessions": 10
  }
}
```

---

### Flow 2: Purchase Single Session

**Endpoint**: `POST /api/enrollments/sessions/:sessionId/purchase`

**Process**:
1. **Validate Session**:
   - Session exists
   - Session not in past
   - Session status is 'scheduled'

2. **Check Existing Purchase**:
   - User hasn't already purchased this session
   - Return error if duplicate

3. **Check Credit Balance**:
   - Get `course.price_per_session`
   - Check `user.credit_balance >= price`
   - Return error if insufficient

4. **Deduct Credit**:
   ```sql
   UPDATE users 
   SET credit_balance = credit_balance - price 
   WHERE id = user_id
   ```

5. **Create Purchase**:
   ```typescript
   {
     user_id: userId,
     course_id: session.course_id,
     session_id: sessionId,
     price_paid: price,
     payment_status: 'paid',
     status: 'active'
   }
   ```

6. **Create Payment Hold**:
   ```typescript
   {
     session_purchase_id: purchase.id,
     teacher_id: course.teacher_id,
     student_id: userId,
     amount: price,
     status: 'held'
   }
   ```

7. **Return Purchase**

**Response**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "price_paid": 12,
  "payment_status": "paid",
  "status": "active",
  "purchased_at": "2025-11-26T10:00:00Z",
  "session": {
    "id": "uuid",
    "title": "Introduction & Greetings",
    "scheduled_date": "2025-12-01",
    "start_time": "14:00"
  }
}
```

---

### Flow 3: Cancel Enrollment (Refund)

**Endpoint**: `DELETE /api/enrollments/:enrollmentId`

**Request Body** (optional):
```json
{
  "reason": "Changed my mind"
}
```

**Process**:
1. **Validate Enrollment**:
   - Enrollment exists
   - User owns the enrollment
   - Enrollment status is 'active'

2. **Find Payment Hold**:
   - Get hold where `enrollment_id = enrollmentId` AND `status = 'held'`
   - Return error if hold not found or already processed

3. **Refund Credit**:
   ```sql
   UPDATE users 
   SET credit_balance = credit_balance + hold.amount 
   WHERE id = user_id
   ```

4. **Update Enrollment**:
   ```typescript
   {
     status: 'cancelled',
     cancelled_at: new Date(),
     refund_amount: hold.amount
   }
   ```

5. **Update Payment Hold**:
   ```typescript
   {
     status: 'refunded',
     released_at: new Date()
   }
   ```

6. **Update Course**:
   ```sql
   UPDATE courses 
   SET current_students = current_students - 1 
   WHERE id = course_id
   ```

7. **Return Success Message**

**Response**:
```json
{
  "message": "Enrollment cancelled and refunded successfully",
  "refund_amount": 100
}
```

---

### Flow 4: Cancel Session Purchase (Refund)

**Endpoint**: `DELETE /api/enrollments/sessions/:purchaseId`

**Process**:
1. **Validate Purchase**:
   - Purchase exists
   - User owns the purchase
   - Purchase status is 'active'
   - Session not attended yet

2. **Find Payment Hold**:
   - Get hold where `session_purchase_id = purchaseId` AND `status = 'held'`

3. **Refund Credit**:
   ```sql
   UPDATE users 
   SET credit_balance = credit_balance + hold.amount 
   WHERE id = user_id
   ```

4. **Update Purchase**:
   ```typescript
   {
     status: 'cancelled',
     cancelled_at: new Date(),
     refund_amount: hold.amount
   }
   ```

5. **Update Payment Hold**:
   ```typescript
   {
     status: 'refunded',
     released_at: new Date()
   }
   ```

6. **Return Success Message**

**Response**:
```json
{
  "message": "Session purchase cancelled and refunded successfully",
  "refund_amount": 12
}
```

---

### Flow 5: Get My Enrollments

**Endpoint**: `GET /api/enrollments/me`

**Process**:
1. Get all enrollments for current user
2. Load course details
3. Load teacher info
4. Order by `created_at DESC`
5. Return enrollments

**Response**:
```json
[
  {
    "id": "uuid",
    "course_id": "uuid",
    "enrollment_type": "full_course",
    "total_price_paid": 100,
    "payment_status": "paid",
    "status": "active",
    "completion_percentage": 30,
    "enrolled_at": "2025-11-26T10:00:00Z",
    "course": {
      "id": "uuid",
      "title": "English Conversation",
      "total_sessions": 10,
      "teacher": {
        "id": "uuid",
        "username": "john_teacher"
      }
    }
  }
]
```

---

### Flow 6: Get My Session Purchases

**Endpoint**: `GET /api/enrollments/me/sessions`

**Process**:
1. Get all session purchases for current user
2. Load session details
3. Load course & teacher info
4. Order by `created_at DESC`
5. Return purchases

**Response**:
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "price_paid": 12,
    "payment_status": "paid",
    "status": "active",
    "attended": false,
    "attendance_duration_minutes": 0,
    "purchased_at": "2025-11-26T10:00:00Z",
    "session": {
      "id": "uuid",
      "title": "Introduction & Greetings",
      "scheduled_date": "2025-12-01",
      "start_time": "14:00",
      "end_time": "16:00"
    },
    "course": {
      "id": "uuid",
      "title": "English Conversation",
      "teacher": {
        "id": "uuid",
        "username": "john_teacher"
      }
    }
  }
]
```

---

### Flow 7: Check Session Access

**Endpoint**: `GET /api/enrollments/sessions/:sessionId/access`

**Process**:
1. Get session details
2. Check if user has full course enrollment for this course
3. If not, check if user purchased this specific session
4. Return access status

**Response**:
```json
{
  "hasAccess": true
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/enrollments/courses/:courseId` | Enroll in course | ✅ | Student |
| POST | `/api/enrollments/sessions/:sessionId/purchase` | Buy session | ✅ | Student |
| DELETE | `/api/enrollments/:enrollmentId` | Cancel enrollment | ✅ | Student (owner) |
| DELETE | `/api/enrollments/sessions/:purchaseId` | Cancel session | ✅ | Student (owner) |
| GET | `/api/enrollments/me` | My enrollments | ✅ | Student |
| GET | `/api/enrollments/me/sessions` | My purchases | ✅ | Student |
| GET | `/api/enrollments/sessions/:sessionId/access` | Check access | ✅ | Student |

---

# Phase 3: Payment Auto-Release & Commission

## 📋 Overview

**Purpose**: Automatically release held payments to teachers after session completion based on attendance. Calculate and distribute commissions.

**Status**: ⏳ **PENDING**

---

## 🗄️ Database Entities

### 1. Transaction Entity

**Table**: `transactions`

**Purpose**: Record all financial transactions

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  user_id: string (UUID, FOREIGN KEY → users.id)
  
  // Transaction Type
  type: string (VARCHAR 50, NOT NULL)
  // Types: 'deposit', 'purchase', 'refund', 'commission', 
  //        'payment_release', 'withdrawal', 'referral_bonus'
  
  // Amount
  amount: number (DECIMAL 10,2, NOT NULL)
  balance_before: number (DECIMAL 10,2, NOT NULL)
  balance_after: number (DECIMAL 10,2, NOT NULL)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'pending') // pending, completed, failed
  
  // Reference
  reference_type: string (VARCHAR 50, NULLABLE) // 'enrollment', 'session_purchase', 'payment_hold'
  reference_id: string (UUID, NULLABLE)
  
  // Description
  description: string (TEXT, NULLABLE)
  
  // Metadata (JSON)
  metadata: json (NULLABLE)
  // Example: { "course_id": "uuid", "session_id": "uuid", "commission_rate": 0.3 }
  
  // Dates
  created_at: timestamp
  completed_at: timestamp (NULLABLE)
}
```

**Indexes**:
- `idx_user` on `user_id`
- `idx_type` on `type`
- `idx_status` on `status`
- `idx_created_at` on `created_at`

**Relations**:
- `user`: ManyToOne → User

---

### 2. Withdrawal Entity

**Table**: `withdrawals`

**Purpose**: Track teacher withdrawal requests

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  teacher_id: string (UUID, FOREIGN KEY → users.id)
  
  // Amount
  amount: number (DECIMAL 10,2, NOT NULL)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'pending')
  // pending, processing, completed, rejected
  
  // Bank Info (JSON)
  bank_account_info: json (NOT NULL)
  // { "bank_name": "...", "account_number": "...", "account_name": "..." }
  
  // Dates
  requested_at: timestamp (DEFAULT CURRENT_TIMESTAMP)
  processed_at: timestamp (NULLABLE)
  completed_at: timestamp (NULLABLE)
  
  // Notes
  notes: string (TEXT, NULLABLE)
  admin_notes: string (TEXT, NULLABLE)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_teacher` on `teacher_id`
- `idx_status` on `status`
- `idx_requested_at` on `requested_at`

**Relations**:
- `teacher`: ManyToOne → User

---

### 3. AttendanceRecord Entity

**Table**: `attendance_records`

**Purpose**: Track student attendance in sessions

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  session_id: string (UUID, FOREIGN KEY → course_sessions.id)
  user_id: string (UUID, FOREIGN KEY → users.id)
  
  // Attendance
  joined_at: timestamp (NULLABLE)
  left_at: timestamp (NULLABLE)
  duration_minutes: number (INT, DEFAULT 0)
  
  // Calculated
  attendance_percentage: number (DECIMAL 5,2, DEFAULT 0)
  // (duration_minutes / session.duration_minutes) * 100
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'absent') // absent, present, late
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_session` on `session_id`
- `idx_user` on `user_id`
- `unique_session_user` on `(session_id, user_id)`

**Relations**:
- `session`: ManyToOne → CourseSession
- `user`: ManyToOne → User

---

## 🔄 Business Logic Flows

### Flow 1: Track Attendance (LiveKit Webhook)

**Webhook**: `POST /api/webhooks/livekit`

**Event Types**:
- `participant_joined`
- `participant_left`
- `room_finished`

**Process for `participant_joined`**:
```typescript
{
  event: 'participant_joined',
  room: {
    name: 'course_abc123_session_1'
  },
  participant: {
    identity: 'user_xyz789',
    joined_at: '2025-12-01T14:05:00Z'
  }
}
```

1. **Parse Room Name**:
   - Extract `course_id` and `session_number`
   - Find session by course_id and session_number

2. **Create/Update Attendance Record**:
   ```typescript
   {
     session_id: session.id,
     user_id: participant.identity,
     joined_at: participant.joined_at,
     status: 'present'
   }
   ```

**Process for `participant_left`**:
```typescript
{
  event: 'participant_left',
  participant: {
    identity: 'user_xyz789',
    left_at: '2025-12-01T15:45:00Z'
  }
}
```

1. **Find Attendance Record**
2. **Update Record**:
   ```typescript
   {
     left_at: participant.left_at,
     duration_minutes: calculateDuration(joined_at, left_at),
     attendance_percentage: (duration_minutes / session.duration_minutes) * 100
   }
   ```

**Process for `room_finished`**:
```typescript
{
  event: 'room_finished',
  room: {
    name: 'course_abc123_session_1',
    finished_at: '2025-12-01T16:00:00Z'
  }
}
```

1. **Find Session**
2. **Update Session Status**:
   ```typescript
   {
     status: 'completed'
   }
   ```
3. **Trigger Payment Release** (see Flow 2)

---

### Flow 2: Auto-Release Payments (Cron Job)

**Schedule**: Every 5 minutes

**Process**:
```typescript
async autoReleasePayments() {
  // 1. Find completed sessions in last 24 hours
  const completedSessions = await findCompletedSessions({
    status: 'completed',
    completed_after: Date.now() - 24 * 60 * 60 * 1000
  });
  
  for (const session of completedSessions) {
    // 2. Find all purchases for this session
    const purchases = await findSessionPurchases({
      session_id: session.id,
      status: 'active'
    });
    
    for (const purchase of purchases) {
      // 3. Get attendance record
      const attendance = await getAttendanceRecord({
        session_id: session.id,
        user_id: purchase.user_id
      });
      
      // 4. Calculate attendance percentage
      const attendancePercent = attendance?.attendance_percentage || 0;
      
      // 5. Find payment hold
      const hold = await getPaymentHold({
        session_purchase_id: purchase.id,
        status: 'held'
      });
      
      if (!hold) continue;
      
      // 6. Decide: Release or Refund
      if (attendancePercent >= 20) {
        // RELEASE TO TEACHER
        await releasePaymentToTeacher(hold, attendancePercent);
      } else {
        // REFUND TO STUDENT
        await refundPaymentToStudent(hold);
      }
      
      // 7. Update purchase status
      await updatePurchase(purchase.id, {
        status: attendancePercent >= 20 ? 'attended' : 'missed',
        attended: attendancePercent >= 20,
        attendance_duration_minutes: attendance?.duration_minutes || 0
      });
    }
  }
}
```

---

### Flow 3: Release Payment to Teacher

**Function**: `releasePaymentToTeacher(hold, attendancePercent)`

**Process**:
```typescript
async releasePaymentToTeacher(hold: PaymentHold, attendancePercent: number) {
  // 1. Calculate commission
  const commissionRate = await getCommissionRate(hold.teacher_id);
  // If teacher was referred by another teacher: 70% to teacher, 30% to platform
  // Otherwise: 100% to teacher
  
  const teacherAmount = hold.amount * (1 - commissionRate);
  const platformAmount = hold.amount * commissionRate;
  
  // 2. Add to teacher balance
  await updateUserBalance(hold.teacher_id, teacherAmount);
  
  // 3. Create transaction for teacher
  await createTransaction({
    user_id: hold.teacher_id,
    type: 'payment_release',
    amount: teacherAmount,
    reference_type: 'payment_hold',
    reference_id: hold.id,
    description: `Payment released for session (${attendancePercent}% attendance)`,
    metadata: {
      original_amount: hold.amount,
      commission_rate: commissionRate,
      platform_fee: platformAmount
    }
  });
  
  // 4. Create transaction for platform (if commission)
  if (platformAmount > 0) {
    await createTransaction({
      user_id: 'platform',
      type: 'commission',
      amount: platformAmount,
      reference_type: 'payment_hold',
      reference_id: hold.id,
      description: `Platform commission`,
      metadata: {
        teacher_id: hold.teacher_id,
        commission_rate: commissionRate
      }
    });
  }
  
  // 5. Update payment hold
  await updatePaymentHold(hold.id, {
    status: 'released',
    released_at: new Date(),
    release_percentage: attendancePercent
  });
  
  // 6. Send notification to teacher
  await sendNotification(hold.teacher_id, {
    type: 'payment_released',
    title: 'Payment Released',
    message: `You received $${teacherAmount} for completed session`
  });
}
```

---

### Flow 4: Refund Payment to Student

**Function**: `refundPaymentToStudent(hold)`

**Process**:
```typescript
async refundPaymentToStudent(hold: PaymentHold) {
  // 1. Add to student balance
  await updateUserBalance(hold.student_id, hold.amount);
  
  // 2. Create transaction
  await createTransaction({
    user_id: hold.student_id,
    type: 'refund',
    amount: hold.amount,
    reference_type: 'payment_hold',
    reference_id: hold.id,
    description: 'Refund due to low attendance (<20%)',
    metadata: {
      reason: 'low_attendance'
    }
  });
  
  // 3. Update payment hold
  await updatePaymentHold(hold.id, {
    status: 'refunded',
    released_at: new Date(),
    notes: 'Refunded due to attendance < 20%'
  });
  
  // 4. Update purchase
  await updateSessionPurchase({
    refund_amount: hold.amount,
    status: 'missed'
  });
  
  // 5. Send notification to student
  await sendNotification(hold.student_id, {
    type: 'refund_issued',
    title: 'Refund Issued',
    message: `You received $${hold.amount} refund due to low attendance`
  });
}
```

---

### Flow 5: Request Withdrawal

**Endpoint**: `POST /api/withdrawals`

**Request**:
```json
{
  "amount": 500,
  "bank_account_info": {
    "bank_name": "ABC Bank",
    "account_number": "1234567890",
    "account_name": "John Teacher"
  }
}
```

**Process**:
1. **Validate Teacher**:
   - User is a teacher
   - User is verified

2. **Check Available Balance**:
   - Get teacher's available balance (not held)
   - Check `available_balance >= amount`
   - Return error if insufficient

3. **Create Withdrawal Request**:
   ```typescript
   {
     teacher_id: userId,
     amount: amount,
     status: 'pending',
     bank_account_info: bankInfo,
     requested_at: new Date()
   }
   ```

4. **Deduct from Available Balance** (optional, or wait for admin approval):
   ```sql
   UPDATE users 
   SET credit_balance = credit_balance - amount 
   WHERE id = teacher_id
   ```

5. **Create Transaction**:
   ```typescript
   {
     user_id: teacher_id,
     type: 'withdrawal',
     amount: -amount,
     status: 'pending',
     reference_type: 'withdrawal',
     reference_id: withdrawal.id,
     description: 'Withdrawal request'
   }
   ```

6. **Notify Admin**

7. **Return Withdrawal**

**Response**:
```json
{
  "id": "uuid",
  "amount": 500,
  "status": "pending",
  "requested_at": "2025-11-26T10:00:00Z"
}
```

---

### Flow 6: Admin Approve Withdrawal

**Endpoint**: `PATCH /api/admin/withdrawals/:id/approve`

**Request**:
```json
{
  "notes": "Processed via bank transfer"
}
```

**Process**:
1. **Validate Admin**
2. **Find Withdrawal**
3. **Update Withdrawal**:
   ```typescript
   {
     status: 'completed',
     processed_at: new Date(),
     completed_at: new Date(),
     admin_notes: notes
   }
   ```
4. **Update Transaction**:
   ```typescript
   {
     status: 'completed',
     completed_at: new Date()
   }
   ```
5. **Notify Teacher**
6. **Return Updated Withdrawal**

---

### Flow 7: Get Teacher Revenue Dashboard

**Endpoint**: `GET /api/teachers/me/revenue`

**Process**:
1. **Get Total Earnings**:
   ```sql
   SELECT SUM(amount) 
   FROM transactions 
   WHERE user_id = teacher_id 
     AND type = 'payment_release' 
     AND status = 'completed'
   ```

2. **Get Available Balance**:
   ```sql
   SELECT credit_balance FROM users WHERE id = teacher_id
   ```

3. **Get Pending Payments** (held):
   ```sql
   SELECT SUM(amount) 
   FROM payment_holds 
   WHERE teacher_id = teacher_id 
     AND status = 'held'
   ```

4. **Get Withdrawal History**:
   ```sql
   SELECT * FROM withdrawals 
   WHERE teacher_id = teacher_id 
   ORDER BY requested_at DESC 
   LIMIT 10
   ```

5. **Get Recent Transactions**:
   ```sql
   SELECT * FROM transactions 
   WHERE user_id = teacher_id 
   ORDER BY created_at DESC 
   LIMIT 20
   ```

**Response**:
```json
{
  "total_earnings": 5000,
  "available_balance": 1200,
  "pending_payments": 800,
  "total_withdrawn": 3000,
  "withdrawals": [
    {
      "id": "uuid",
      "amount": 500,
      "status": "completed",
      "requested_at": "2025-11-20T10:00:00Z",
      "completed_at": "2025-11-21T15:00:00Z"
    }
  ],
  "recent_transactions": [
    {
      "id": "uuid",
      "type": "payment_release",
      "amount": 100,
      "description": "Payment released for session",
      "created_at": "2025-11-26T10:00:00Z"
    }
  ]
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/webhooks/livekit` | LiveKit webhook | ❌ | Webhook |
| POST | `/api/withdrawals` | Request withdrawal | ✅ | Teacher |
| GET | `/api/withdrawals/me` | My withdrawals | ✅ | Teacher |
| GET | `/api/teachers/me/revenue` | Revenue dashboard | ✅ | Teacher |
| GET | `/api/transactions/me` | My transactions | ✅ | Any |
| PATCH | `/api/admin/withdrawals/:id/approve` | Approve withdrawal | ✅ | Admin |
| PATCH | `/api/admin/withdrawals/:id/reject` | Reject withdrawal | ✅ | Admin |
| GET | `/api/admin/withdrawals` | All withdrawals | ✅ | Admin |

---

# Phase 4: Free Talk Rooms

## 📋 Overview

**Purpose**: Allow users to create and join free conversation rooms. Rooms can be filtered by location (GeoIP), language, and topic.

**Status**: ⏳ **PENDING**

---

## 🗄️ Database Entities

### 1. FreeTalkRoom Entity

**Table**: `free_talk_rooms`

**Purpose**: Free conversation rooms

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  host_id: string (UUID, FOREIGN KEY → users.id)
  
  // Room Info
  title: string (VARCHAR 255, NOT NULL)
  description: string (TEXT, NULLABLE)
  topic: string (VARCHAR 100, NULLABLE)
  language: string (VARCHAR 50, NULLABLE)
  
  // Capacity
  max_participants: number (INT, DEFAULT 10)
  current_participants: number (INT, DEFAULT 0)
  
  // Location (for nearby search)
  country: string (VARCHAR 100, NULLABLE)
  city: string (VARCHAR 100, NULLABLE)
  latitude: number (DECIMAL 10,7, NULLABLE)
  longitude: number (DECIMAL 10,7, NULLABLE)
  
  // Meeting
  livekit_room_name: string (VARCHAR 255, NOT NULL)
  meeting_link: string (VARCHAR 500, NULLABLE)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'active') // active, ongoing, ended
  is_public: boolean (DEFAULT true)
  
  // Schedule
  scheduled_start: timestamp (NULLABLE)
  scheduled_end: timestamp (NULLABLE)
  actual_start: timestamp (NULLABLE)
  actual_end: timestamp (NULLABLE)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_host` on `host_id`
- `idx_status` on `status`
- `idx_language` on `language`
- `idx_location` on `(latitude, longitude)`
- `idx_created_at` on `created_at`

**Relations**:
- `host`: ManyToOne → User
- `participants`: OneToMany → FreeTalkParticipant

---

### 2. FreeTalkParticipant Entity

**Table**: `free_talk_participants`

**Purpose**: Track participants in free talk rooms

**Columns**:
```typescript
{
  id: string (UUID, PRIMARY KEY)
  room_id: string (UUID, FOREIGN KEY → free_talk_rooms.id)
  user_id: string (UUID, FOREIGN KEY → users.id)
  
  // Participation
  joined_at: timestamp (DEFAULT CURRENT_TIMESTAMP)
  left_at: timestamp (NULLABLE)
  duration_minutes: number (INT, DEFAULT 0)
  
  // Status
  status: string (VARCHAR 50, DEFAULT 'active') // active, left
  is_host: boolean (DEFAULT false)
  
  // Timestamps
  created_at: timestamp
  updated_at: timestamp
}
```

**Indexes**:
- `idx_room` on `room_id`
- `idx_user` on `user_id`
- `unique_room_user` on `(room_id, user_id)`

**Relations**:
- `room`: ManyToOne → FreeTalkRoom
- `user`: ManyToOne → User

---

## 🔄 Business Logic Flows

### Flow 1: Create Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms`

**Request**:
```json
{
  "title": "English Practice - Beginners Welcome",
  "description": "Let's practice English conversation",
  "topic": "Daily Life",
  "language": "English",
  "max_participants": 10,
  "is_public": true,
  "scheduled_start": "2025-12-01T14:00:00Z"
}
```

**Process**:
1. **Get User Location** (from IP using GeoIP):
   ```typescript
   const geoData = await getGeoLocation(req.ip);
   // { country: 'Vietnam', city: 'Hanoi', lat: 21.0285, lon: 105.8542 }
   ```

2. **Generate LiveKit Room Name**:
   ```typescript
   const roomName = `freetalk_${Date.now()}_${randomString(6)}`;
   ```

3. **Create Room**:
   ```typescript
   {
     host_id: userId,
     title: title,
     description: description,
     topic: topic,
     language: language,
     max_participants: max_participants,
     current_participants: 0,
     country: geoData.country,
     city: geoData.city,
     latitude: geoData.lat,
     longitude: geoData.lon,
     livekit_room_name: roomName,
     status: 'active',
     is_public: is_public,
     scheduled_start: scheduled_start
   }
   ```

4. **Create Host Participant**:
   ```typescript
   {
     room_id: room.id,
     user_id: userId,
     is_host: true,
     status: 'active'
   }
   ```

5. **Increment Current Participants**:
   ```sql
   UPDATE free_talk_rooms 
   SET current_participants = 1 
   WHERE id = room.id
   ```

6. **Return Room**

**Response**:
```json
{
  "id": "uuid",
  "title": "English Practice - Beginners Welcome",
  "livekit_room_name": "freetalk_1732614000_abc123",
  "current_participants": 1,
  "max_participants": 10,
  "status": "active"
}
```

---

### Flow 2: Browse Free Talk Rooms

**Endpoint**: `GET /api/free-talk/rooms`

**Query Parameters**:
```
?language=English
&topic=Daily Life
&nearby=true
&lat=21.0285
&lon=105.8542
&radius=50
&page=1
&limit=20
```

**Process**:
1. **Base Query**:
   - Filter by `status = 'active'`
   - Filter by `is_public = true`

2. **Apply Language Filter** (if provided)

3. **Apply Topic Filter** (if provided)

4. **Apply Nearby Filter** (if `nearby=true`):
   ```sql
   SELECT *, 
     (6371 * acos(
       cos(radians(:lat)) * 
       cos(radians(latitude)) * 
       cos(radians(longitude) - radians(:lon)) + 
       sin(radians(:lat)) * 
       sin(radians(latitude))
     )) AS distance
   FROM free_talk_rooms
   WHERE status = 'active'
   HAVING distance < :radius
   ORDER BY distance ASC
   ```

5. **Load Host Info**

6. **Paginate**

7. **Return Rooms**

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "English Practice - Beginners Welcome",
      "description": "Let's practice English conversation",
      "topic": "Daily Life",
      "language": "English",
      "current_participants": 3,
      "max_participants": 10,
      "country": "Vietnam",
      "city": "Hanoi",
      "distance": 2.5,
      "host": {
        "id": "uuid",
        "username": "john_doe",
        "avatar_url": "..."
      },
      "scheduled_start": "2025-12-01T14:00:00Z",
      "status": "active"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

---

### Flow 3: Join Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms/:roomId/join`

**Process**:
1. **Validate Room**:
   - Room exists
   - Room status is 'active'
   - Room not full (`current_participants < max_participants`)

2. **Check Existing Participation**:
   - User not already in room
   - Return error if duplicate

3. **Create Participant**:
   ```typescript
   {
     room_id: roomId,
     user_id: userId,
     is_host: false,
     status: 'active'
   }
   ```

4. **Increment Participants**:
   ```sql
   UPDATE free_talk_rooms 
   SET current_participants = current_participants + 1 
   WHERE id = roomId
   ```

5. **Generate LiveKit Token**:
   ```typescript
   const token = await generateLiveKitToken({
     room: room.livekit_room_name,
     identity: userId,
     name: user.username
   });
   ```

6. **Return Join Info**

**Response**:
```json
{
  "room": {
    "id": "uuid",
    "title": "English Practice",
    "livekit_room_name": "freetalk_1732614000_abc123"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "livekit_url": "wss://livekit.example.com"
}
```

---

### Flow 4: Leave Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms/:roomId/leave`

**Process**:
1. **Find Participant**:
   - Get participant where `room_id = roomId` AND `user_id = userId`

2. **Update Participant**:
   ```typescript
   {
     status: 'left',
     left_at: new Date(),
     duration_minutes: calculateDuration(joined_at, left_at)
   }
   ```

3. **Decrement Participants**:
   ```sql
   UPDATE free_talk_rooms 
   SET current_participants = current_participants - 1 
   WHERE id = roomId
   ```

4. **If Host Leaves**:
   - If `is_host = true` AND `current_participants = 0`:
     ```sql
     UPDATE free_talk_rooms 
     SET status = 'ended', actual_end = NOW() 
     WHERE id = roomId
     ```

5. **Return Success**

**Response**:
```json
{
  "message": "Left room successfully",
  "duration_minutes": 45
}
```

---

### Flow 5: Get Nearby Rooms (Map View)

**Endpoint**: `GET /api/free-talk/rooms/nearby`

**Query Parameters**:
```
?lat=21.0285
&lon=105.8542
&radius=10
```

**Process**:
1. **Find Rooms Within Radius**:
   ```sql
   SELECT *, 
     (6371 * acos(
       cos(radians(:lat)) * 
       cos(radians(latitude)) * 
       cos(radians(longitude) - radians(:lon)) + 
       sin(radians(:lat)) * 
       sin(radians(latitude))
     )) AS distance
   FROM free_talk_rooms
   WHERE status = 'active'
     AND is_public = true
   HAVING distance < :radius
   ORDER BY distance ASC
   ```

2. **Load Host Info**

3. **Return Rooms with Coordinates**

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "English Practice",
    "latitude": 21.0285,
    "longitude": 105.8542,
    "distance": 0.5,
    "current_participants": 3,
    "max_participants": 10,
    "language": "English",
    "host": {
      "username": "john_doe"
    }
  }
]
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/free-talk/rooms` | Create room | ✅ | Any |
| GET | `/api/free-talk/rooms` | List rooms | ❌ | Public |
| GET | `/api/free-talk/rooms/nearby` | Nearby rooms | ❌ | Public |
| GET | `/api/free-talk/rooms/:id` | Room details | ❌ | Public |
| POST | `/api/free-talk/rooms/:id/join` | Join room | ✅ | Any |
| POST | `/api/free-talk/rooms/:id/leave` | Leave room | ✅ | Any |
| DELETE | `/api/free-talk/rooms/:id` | Delete room | ✅ | Host |
| PATCH | `/api/free-talk/rooms/:id` | Update room | ✅ | Host |

---

# Phase 5: Advanced Features

## 📋 Additional Features

### 1. Course Reviews & Ratings

**Entities**:
- `CourseReview`: Student reviews for courses
- Columns: `id`, `course_id`, `user_id`, `rating`, `comment`, `created_at`

**Endpoints**:
- `POST /api/courses/:id/reviews` - Add review
- `GET /api/courses/:id/reviews` - Get reviews

---

### 2. Teacher Availability

**Entities**:
- `TeacherAvailability`: Teacher's available time slots
- Columns: `id`, `teacher_id`, `day_of_week`, `start_time`, `end_time`, `is_available`

**Endpoints**:
- `POST /api/teachers/me/availability` - Set availability
- `GET /api/teachers/:id/availability` - Get availability

---

### 3. Notifications

**Entities**:
- `Notification`: User notifications
- Columns: `id`, `user_id`, `type`, `title`, `message`, `read`, `created_at`

**Endpoints**:
- `GET /api/notifications/me` - Get my notifications
- `PATCH /api/notifications/:id/read` - Mark as read

---

### 4. Analytics & Reports

**Endpoints**:
- `GET /api/teachers/me/analytics` - Teacher analytics
- `GET /api/students/me/analytics` - Student analytics
- `GET /api/admin/analytics` - Platform analytics

---

## 📊 Summary

| Phase | Status | Entities | Endpoints | Complexity |
|-------|--------|----------|-----------|------------|
| Phase 1 | ✅ Complete | 2 | 10 | Medium |
| Phase 2 | ✅ Complete | 3 | 7 | High |
| Phase 3 | ⏳ Pending | 3 | 8 | Very High |
| Phase 4 | ⏳ Pending | 2 | 8 | Medium |
| Phase 5 | ⏳ Pending | 3+ | 10+ | Medium |

**Total Entities**: 13+  
**Total Endpoints**: 43+  
**Overall Complexity**: Very High

---

## 🎯 Implementation Priority

1. ✅ **Phase 1** - Course Management (DONE)
2. ✅ **Phase 2** - Enrollment & Payment Hold (DONE)
3. 🚀 **Phase 3** - Payment Auto-Release (NEXT)
4. 📅 **Phase 4** - Free Talk Rooms
5. 📈 **Phase 5** - Advanced Features

---

**End of Implementation Guide**
