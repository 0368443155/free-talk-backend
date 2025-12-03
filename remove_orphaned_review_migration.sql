-- Remove orphaned migration record for AddReviewsTableAndCourseColumns
USE talkplatform;
DELETE FROM migrations WHERE name LIKE '%AddReviewsTableAndCourseColumns%';
SELECT '✅ Removed orphaned migration record' as Status;
