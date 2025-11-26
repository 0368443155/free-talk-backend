# 🔍 Debug Migration Issue

## Check Existing Table Structure

Run these commands in MySQL to find the exact data type:

```sql
-- 1. Check users table structure
SHOW CREATE TABLE users;

-- 2. Check specific column
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLLATION_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'talkplatform'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'id';

-- 3. Check courses table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLLATION_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'talkplatform'
  AND TABLE_NAME = 'courses'
  AND COLUMN_NAME = 'id';

-- 4. Check course_sessions table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLLATION_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'talkplatform'
  AND TABLE_NAME = 'course_sessions'
  AND COLUMN_NAME = 'id';
```

---

## Likely Solutions

### Solution 1: Match Exact Column Type

If `users.id` is `CHAR(36)`, use:
```sql
CREATE TABLE course_enrollments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  ...
);
```

If `users.id` is `VARCHAR(255)`, use:
```sql
CREATE TABLE course_enrollments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  ...
);
```

### Solution 2: Match Collation

Add `COLLATE` to match:
```sql
CREATE TABLE course_enrollments (
  id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  course_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Solution 3: Create Without Foreign Keys First

```sql
-- Step 1: Create table without foreign keys
CREATE TABLE IF NOT EXISTS course_enrollments (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  enrollment_type VARCHAR(20) NOT NULL,
  total_price_paid DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  status VARCHAR(50) DEFAULT 'active',
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_USER_COURSE (user_id, course_id),
  INDEX IDX_ENROLLMENT_USER (user_id),
  INDEX IDX_ENROLLMENT_COURSE (course_id),
  INDEX IDX_ENROLLMENT_STATUS (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 2: Add foreign keys separately
ALTER TABLE course_enrollments
ADD CONSTRAINT FK_ENROLLMENT_USER 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE course_enrollments
ADD CONSTRAINT FK_ENROLLMENT_COURSE 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
```

---

## Action Plan

1. **Run the debug queries above** to see exact column types
2. **Share the output** with me
3. I'll give you the **exact SQL** that will work

OR

**Try Solution 3** (create without FK first, then add FK separately)

---

## Quick Test

Try this simplified version:

```sql
-- Test if basic table creation works
CREATE TABLE test_enrollment (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL
);

-- Test if FK works
ALTER TABLE test_enrollment
ADD CONSTRAINT FK_TEST_USER 
FOREIGN KEY (user_id) REFERENCES users(id);

-- If success, drop test table
DROP TABLE test_enrollment;
```

This will tell us if the issue is with the column type or something else.
