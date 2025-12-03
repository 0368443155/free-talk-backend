-- Quick clean Phase 1 from talkplatform database
-- Run: mysql -u root -p talkplatform < clean_phase1_simple.sql

USE talkplatform;

-- Drop meeting_participants table
DROP TABLE IF EXISTS meeting_participants;

-- Drop Phase 1 columns from meetings
ALTER TABLE meetings DROP COLUMN IF EXISTS state;
ALTER TABLE meetings DROP COLUMN IF EXISTS opened_at;
ALTER TABLE meetings DROP COLUMN IF EXISTS closed_at;
ALTER TABLE meetings DROP COLUMN IF EXISTS auto_opened;
ALTER TABLE meetings DROP COLUMN IF EXISTS auto_closed;
ALTER TABLE meetings DROP COLUMN IF EXISTS requires_manual_review;
ALTER TABLE meetings DROP COLUMN IF EXISTS review_reason;

-- Drop Phase 1 columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent_20min;
ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS student_notes;
ALTER TABLE bookings DROP COLUMN IF EXISTS teacher_notes;

-- Drop Phase 1 columns from notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS status;
ALTER TABLE notifications DROP COLUMN IF EXISTS sent_at;

-- Clean migration records
DELETE FROM migrations WHERE timestamp >= 1733212800000;
DELETE FROM migrations WHERE name LIKE '%Phase1%';
DELETE FROM migrations WHERE name LIKE '%AddMeetingStateTracking%';
DELETE FROM migrations WHERE name LIKE '%CreateMeetingParticipants%';
DELETE FROM migrations WHERE name LIKE '%AddBookingNotes%';
DELETE FROM migrations WHERE name LIKE '%AddNotificationStatusFields%';

SELECT '✅ Phase 1 cleanup completed!' as Status;
