-- Remove orphaned migration records that don't have files

USE talkplatform;

-- Check which migrations are causing issues
SELECT * FROM migrations 
WHERE name IN (
  'CreateMetricsTablesPhase11733112000000',
  'AddClerkIdToUser1762248322373',
  'AddReviewsTableAndCourseColumns1764582318462',
  'CreateCourseTemplates1766000000002'
)
ORDER BY timestamp;

-- Delete orphaned records (migrations that don't have files)
DELETE FROM migrations WHERE name = 'CreateMetricsTablesPhase11733112000000';

-- Verify
SELECT '✅ Cleaned orphaned migration records' as Status;
SELECT COUNT(*) as remaining_migrations FROM migrations;
