-- Check migrations table
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;

-- Delete problematic migration record if it doesn't have a file
DELETE FROM migrations WHERE name = 'CreateMetricsTablesPhase11733112000000';
