-- ==========================================
-- ROLLBACK DATABASE TO BEFORE MIGRATION
-- ==========================================

-- Check current migrations
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;

-- Show tables that might have been added
SHOW TABLES LIKE '%classroom%';
SHOW TABLES LIKE '%free_talk%';

-- Check meetings table structure
DESCRIBE meetings;

-- ==========================================
-- ROLLBACK STEPS (Run these if needed)
-- ==========================================

-- 1. Drop classroom_chat_messages table if exists
-- DROP TABLE IF EXISTS `classroom_chat_messages`;

-- 2. Revert meeting_type column if modified
-- ALTER TABLE `meetings` 
-- MODIFY COLUMN `meeting_type` enum('class','free_talk') NOT NULL DEFAULT 'class';

-- 3. Remove migrations from migrations table
-- DELETE FROM migrations WHERE name LIKE '%Classroom%';
-- DELETE FROM migrations WHERE name LIKE '%FreeTalk%';

-- ==========================================
-- VERIFY STATE
-- ==========================================

-- Check meetings are still there
SELECT COUNT(*) as total_meetings FROM meetings;
SELECT id, title, status, created_at FROM meetings ORDER BY created_at DESC LIMIT 5;

-- Check meeting_type values
SELECT meeting_type, COUNT(*) as count FROM meetings GROUP BY meeting_type;
