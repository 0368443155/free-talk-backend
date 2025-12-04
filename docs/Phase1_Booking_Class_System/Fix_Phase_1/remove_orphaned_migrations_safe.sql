-- Remove orphaned migration records - SAFE MODE DISABLED
SET SQL_SAFE_UPDATES = 0;

USE talkplatform;

-- Delete orphaned records
DELETE FROM migrations WHERE name LIKE '%AddReviewsTableAndCourseColumns%';
DELETE FROM migrations WHERE name LIKE '%CreateMetricsTablesPhase1%';
DELETE FROM migrations WHERE name LIKE '%AddClerkIdToUser%';

-- Re-enable safe mode
SET SQL_SAFE_UPDATES = 1;

SELECT '✅ Cleaned orphaned migrations' as Status;
