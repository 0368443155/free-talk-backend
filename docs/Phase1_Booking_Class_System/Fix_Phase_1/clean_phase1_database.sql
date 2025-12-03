-- ============================================================================
-- CLEAN PHASE 1 CHANGES FROM DATABASE
-- Date: 2025-12-03
-- Purpose: Remove all Phase 1 additions to return to clean state
-- ============================================================================

-- IMPORTANT: Backup your database first!
-- mysqldump -u YOUR_USERNAME -p YOUR_DATABASE_NAME > backup_before_clean.sql

USE YOUR_DATABASE_NAME; -- Replace with your actual database name

-- ============================================================================
-- 1. DROP PHASE 1 COLUMNS FROM MEETINGS
-- ============================================================================

SET @dbname = DATABASE();
SET @tablename = 'meetings';

-- Drop state column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'state') > 0,
  'ALTER TABLE meetings DROP COLUMN state;',
  'SELECT ''Column state does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop opened_at column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'opened_at') > 0,
  'ALTER TABLE meetings DROP COLUMN opened_at;',
  'SELECT ''Column opened_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop closed_at column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'closed_at') > 0,
  'ALTER TABLE meetings DROP COLUMN closed_at;',
  'SELECT ''Column closed_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop auto_opened column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'auto_opened') > 0,
  'ALTER TABLE meetings DROP COLUMN auto_opened;',
  'SELECT ''Column auto_opened does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop auto_closed column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'auto_closed') > 0,
  'ALTER TABLE meetings DROP COLUMN auto_closed;',
  'SELECT ''Column auto_closed does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop requires_manual_review column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'requires_manual_review') > 0,
  'ALTER TABLE meetings DROP COLUMN requires_manual_review;',
  'SELECT ''Column requires_manual_review does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop review_reason column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'review_reason') > 0,
  'ALTER TABLE meetings DROP COLUMN review_reason;',
  'SELECT ''Column review_reason does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- ============================================================================
-- 2. DROP PHASE 1 COLUMNS FROM BOOKINGS
-- ============================================================================

SET @tablename = 'bookings';

-- Drop reminder_sent_20min column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'reminder_sent_20min') > 0,
  'ALTER TABLE bookings DROP COLUMN reminder_sent_20min;',
  'SELECT ''Column reminder_sent_20min does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop reminder_sent_at column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'reminder_sent_at') > 0,
  'ALTER TABLE bookings DROP COLUMN reminder_sent_at;',
  'SELECT ''Column reminder_sent_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop student_notes column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'student_notes') > 0,
  'ALTER TABLE bookings DROP COLUMN student_notes;',
  'SELECT ''Column student_notes does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop teacher_notes column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'teacher_notes') > 0,
  'ALTER TABLE bookings DROP COLUMN teacher_notes;',
  'SELECT ''Column teacher_notes does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- ============================================================================
-- 3. DROP PHASE 1 COLUMNS FROM NOTIFICATIONS
-- ============================================================================

SET @tablename = 'notifications';

-- Drop status column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'status') > 0,
  'ALTER TABLE notifications DROP COLUMN status;',
  'SELECT ''Column status does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop sent_at column
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'sent_at') > 0,
  'ALTER TABLE notifications DROP COLUMN sent_at;',
  'SELECT ''Column sent_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- ============================================================================
-- 4. DROP MEETING_PARTICIPANTS TABLE
-- ============================================================================

DROP TABLE IF EXISTS meeting_participants;

-- ============================================================================
-- 5. DROP PHASE 1 INDEXES
-- ============================================================================

-- Drop indexes from meetings (ignore errors if not exist)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'meetings'
   AND INDEX_NAME = 'idx_meetings_state') > 0,
  'DROP INDEX idx_meetings_state ON meetings;',
  'SELECT ''Index idx_meetings_state does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'meetings'
   AND INDEX_NAME = 'idx_meetings_opened_at') > 0,
  'DROP INDEX idx_meetings_opened_at ON meetings;',
  'SELECT ''Index idx_meetings_opened_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'meetings'
   AND INDEX_NAME = 'idx_meetings_closed_at') > 0,
  'DROP INDEX idx_meetings_closed_at ON meetings;',
  'SELECT ''Index idx_meetings_closed_at does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- More indexes...
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'meetings'
   AND INDEX_NAME = 'idx_meetings_state_scheduled_at') > 0,
  'DROP INDEX idx_meetings_state_scheduled_at ON meetings;',
  'SELECT ''Index does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop indexes from bookings
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'bookings'
   AND INDEX_NAME = 'idx_bookings_reminder_20min') > 0,
  'DROP INDEX idx_bookings_reminder_20min ON bookings;',
  'SELECT ''Index does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- Drop indexes from notifications
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = 'notifications'
   AND INDEX_NAME = 'idx_notifications_status') > 0,
  'DROP INDEX idx_notifications_status ON notifications;',
  'SELECT ''Index does not exist'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- ============================================================================
-- 6. REMOVE PHASE 1 MIGRATION RECORDS
-- ============================================================================

DELETE FROM migrations WHERE name LIKE '%Phase1%';
DELETE FROM migrations WHERE name LIKE '%AddMeetingStateTracking%';
DELETE FROM migrations WHERE name LIKE '%CreateMeetingParticipants%';
DELETE FROM migrations WHERE name LIKE '%AddBookingNotes%';
DELETE FROM migrations WHERE name LIKE '%AddNotificationStatusFields%';
DELETE FROM migrations WHERE timestamp >= 1733212800000 AND timestamp <= 1733212800004;

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

-- Check meetings table
SELECT 'Meetings columns:' as '';
DESCRIBE meetings;

-- Check bookings table
SELECT 'Bookings columns:' as '';
DESCRIBE bookings;

-- Check notifications table
SELECT 'Notifications columns:' as '';
DESCRIBE notifications;

-- Check if meeting_participants exists
SELECT 'Tables:' as '';
SHOW TABLES LIKE 'meeting_participants';

-- Check remaining migrations
SELECT 'Remaining migrations:' as '';
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ Phase 1 cleanup completed!' as 'Status';
