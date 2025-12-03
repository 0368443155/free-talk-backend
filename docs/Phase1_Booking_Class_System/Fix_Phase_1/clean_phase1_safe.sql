-- Safe clean Phase 1 - Compatible with older MySQL versions
USE talkplatform;

-- Drop meeting_participants table
DROP TABLE IF EXISTS meeting_participants;

-- Drop Phase 1 columns from meetings (ignore errors if not exist)
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='state') > 0, 'ALTER TABLE meetings DROP COLUMN state', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='opened_at') > 0, 'ALTER TABLE meetings DROP COLUMN opened_at', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='closed_at') > 0, 'ALTER TABLE meetings DROP COLUMN closed_at', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='auto_opened') > 0, 'ALTER TABLE meetings DROP COLUMN auto_opened', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='auto_closed') > 0, 'ALTER TABLE meetings DROP COLUMN auto_closed', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='requires_manual_review') > 0, 'ALTER TABLE meetings DROP COLUMN requires_manual_review', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='meetings' AND COLUMN_NAME='review_reason') > 0, 'ALTER TABLE meetings DROP COLUMN review_reason', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop Phase 1 columns from bookings
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='bookings' AND COLUMN_NAME='reminder_sent_20min') > 0, 'ALTER TABLE bookings DROP COLUMN reminder_sent_20min', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='bookings' AND COLUMN_NAME='reminder_sent_at') > 0, 'ALTER TABLE bookings DROP COLUMN reminder_sent_at', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='bookings' AND COLUMN_NAME='student_notes') > 0, 'ALTER TABLE bookings DROP COLUMN student_notes', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='bookings' AND COLUMN_NAME='teacher_notes') > 0, 'ALTER TABLE bookings DROP COLUMN teacher_notes', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop Phase 1 columns from notifications
SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='notifications' AND COLUMN_NAME='status') > 0, 'ALTER TABLE notifications DROP COLUMN status', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @query = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='talkplatform' AND TABLE_NAME='notifications' AND COLUMN_NAME='sent_at') > 0, 'ALTER TABLE notifications DROP COLUMN sent_at', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Clean migration records
DELETE FROM migrations WHERE timestamp >= 1733212800000;
DELETE FROM migrations WHERE name LIKE '%Phase1%';
DELETE FROM migrations WHERE name LIKE '%AddMeetingStateTracking%';
DELETE FROM migrations WHERE name LIKE '%CreateMeetingParticipants%';
DELETE FROM migrations WHERE name LIKE '%AddBookingNotes%';
DELETE FROM migrations WHERE name LIKE '%AddNotificationStatusFields%';

SELECT '✅ Phase 1 cleanup completed!' as Status;
