-- FIX: Merge Migration Tables
-- Problem: 2 tables exist (migrations and migrations_typeorm)
-- Solution: Consolidate into one table

USE talkplatform;

-- Step 1: Check what's in migrations_typeorm
SELECT 'Content of migrations_typeorm:' as info;
SELECT * FROM migrations_typeorm ORDER BY timestamp DESC;

-- Step 2: Check what's in migrations  
SELECT 'Content of migrations:' as info;
SELECT * FROM migrations ORDER BY timestamp DESC;

-- Step 3: Copy any missing records from migrations_typeorm to migrations
-- (Run this only if migrations_typeorm has records that migrations doesn't have)
-- INSERT INTO migrations (timestamp, name)
-- SELECT timestamp, name FROM migrations_typeorm
-- WHERE name NOT IN (SELECT name FROM migrations);

-- Step 4: Drop migrations_typeorm table (TypeORM will use 'migrations' by default)
DROP TABLE IF EXISTS migrations_typeorm;

-- Step 5: Verify
SHOW TABLES LIKE 'migration%';

SELECT '✅ Fixed! Now only one migrations table exists' as Status;
