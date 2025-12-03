-- ============================================================================
-- SIMPLE FIX: Merge Migration Tables
-- Copy this entire script and run in MySQL Workbench
-- ============================================================================

USE talkplatform;

-- Merge all records from migrations_typeorm into migrations
INSERT IGNORE INTO migrations (id, timestamp, name)
SELECT id, timestamp, name FROM migrations_typeorm;

-- Drop the old table
DROP TABLE migrations_typeorm;

-- Verify success
SELECT '✅ SUCCESS! Migration tables merged' as Status;
SELECT CONCAT('Total migrations: ', COUNT(*)) as Info FROM migrations;
SHOW TABLES LIKE 'migration%';
