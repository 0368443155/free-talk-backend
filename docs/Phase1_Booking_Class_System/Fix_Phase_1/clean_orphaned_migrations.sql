-- Clean orphaned migration records
-- Run this in MySQL Workbench

USE talkplatform;

-- Check current migrations
SELECT * FROM migrations ORDER BY timestamp DESC;

-- Delete migration records that don't have corresponding files
-- (These were from previous failed attempts)
DELETE FROM migrations WHERE name LIKE '%Phase1%';
DELETE FROM migrations WHERE name LIKE '%CreateMetricsTablesPhase1%';

-- Verify
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;

SELECT '✅ Cleaned orphaned migrations' as Status;
