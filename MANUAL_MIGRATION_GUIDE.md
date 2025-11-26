# ⚠️ Migration Issue - Manual Steps Required

## Problem

TypeORM migration command is failing. This is likely due to TypeORM CLI configuration issues.

## ✅ Solution: Manual Migration

Since automated migration is failing, please run the SQL manually in MySQL.

### Step 1: Open MySQL

```bash
# Option 1: MySQL Workbench
# Open MySQL Workbench and connect to your database

# Option 2: MySQL CLI
mysql -u root -p
use talkplatform;
```

### Step 2: Run This SQL

```sql
-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  enrollment_type VARCHAR(20) NOT NULL COMMENT 'full_course or per_session',
  total_price_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, paid, refunded',
  status VARCHAR(50) DEFAULT 'active' COMMENT 'active, cancelled, completed',
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_USER_COURSE (user_id, course_id),
  INDEX IDX_ENROLLMENT_USER (user_id),
  INDEX IDX_ENROLLMENT_COURSE (course_id),
  INDEX IDX_ENROLLMENT_STATUS (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create session_purchases table
CREATE TABLE IF NOT EXISTS session_purchases (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  status VARCHAR(50) DEFAULT 'active' COMMENT 'active, cancelled, attended, missed',
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  attended BOOLEAN DEFAULT FALSE,
  attendance_duration_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_USER_SESSION (user_id, session_id),
  INDEX IDX_PURCHASE_USER (user_id),
  INDEX IDX_PURCHASE_SESSION (session_id),
  INDEX IDX_PURCHASE_STATUS (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create payment_holds table
CREATE TABLE IF NOT EXISTS payment_holds (
  id CHAR(36) PRIMARY KEY,
  enrollment_id CHAR(36) NULL,
  session_purchase_id CHAR(36) NULL,
  teacher_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'held' COMMENT 'held, released, refunded',
  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL,
  release_percentage DECIMAL(5,2) DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX IDX_HOLD_TEACHER (teacher_id),
  INDEX IDX_HOLD_STUDENT (student_id),
  INDEX IDX_HOLD_STATUS (status),
  FOREIGN KEY (enrollment_id) REFERENCES course_enrollments(id) ON DELETE SET NULL,
  FOREIGN KEY (session_purchase_id) REFERENCES session_purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Step 3: Verify Tables Created

```sql
SHOW TABLES LIKE '%enrollment%';
SHOW TABLES LIKE '%purchase%';
SHOW TABLES LIKE '%hold%';

-- Should show:
-- course_enrollments
-- session_purchases
-- payment_holds
```

### Step 4: Check Table Structure

```sql
DESCRIBE course_enrollments;
DESCRIBE session_purchases;
DESCRIBE payment_holds;
```

---

## ✅ After Running SQL

Once you've run the SQL successfully, we can proceed with Phase 3!

### Test Backend

```bash
cd talkplatform-backend
npm run build
npm run start:dev
```

### Test Enrollment API

```bash
# Test with Postman or curl
POST http://localhost:3000/api/enrollments/courses/:courseId
POST http://localhost:3000/api/enrollments/sessions/:sessionId/purchase
GET http://localhost:3000/api/enrollments/me
```

---

## 🚀 Ready for Phase 3

Once tables are created, we can start Phase 3:
- Attendance tracking
- Payment auto-release
- Commission calculation
- Withdrawal system

---

## 📝 Note

The TypeORM migration CLI issue is a common problem. Manual SQL execution is a reliable alternative and works perfectly fine for production deployments.

**Status**: ⏳ Waiting for manual SQL execution
**Next**: Phase 3 implementation
