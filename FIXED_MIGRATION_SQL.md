# ✅ Fixed Migration SQL

## Problem
The error "incompatible columns" means the data types don't match between tables.
- `users.id` is likely VARCHAR(36)
- But we're using CHAR(36) in foreign keys

## Solution: Use VARCHAR(36) instead of CHAR(36)

### Run This SQL Instead:

```sql
-- 1. Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
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

-- 2. Create session_purchases table
CREATE TABLE IF NOT EXISTS session_purchases (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
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

-- 3. Create payment_holds table
CREATE TABLE IF NOT EXISTS payment_holds (
  id VARCHAR(36) PRIMARY KEY,
  enrollment_id VARCHAR(36) NULL,
  session_purchase_id VARCHAR(36) NULL,
  teacher_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
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

### Verify Tables Created

```sql
SHOW TABLES LIKE '%enrollment%';
SHOW TABLES LIKE '%purchase%';
SHOW TABLES LIKE '%hold%';

-- Check structure
DESCRIBE course_enrollments;
DESCRIBE session_purchases;
DESCRIBE payment_holds;
```

---

## Key Changes

**Changed**: `CHAR(36)` → `VARCHAR(36)`

This matches the data type used in:
- `users.id`
- `courses.id`
- `course_sessions.id`

---

## After Running SQL

1. Verify all 3 tables exist
2. Run backend build: `npm run build`
3. Start backend: `npm run start:dev`
4. Test enrollment API

---

Ready for Phase 3! 🚀
