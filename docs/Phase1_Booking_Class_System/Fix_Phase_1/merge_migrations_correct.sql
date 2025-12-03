-- CORRECT FIX: Merge migrations_typeorm into migrations
-- migrations_typeorm has 37 records (full history)
-- migrations has only 2 records (recent Phase 3)
-- TypeORM uses 'migrations' table by default

USE talkplatform;

-- Step 1: Verify current state
SELECT 'migrations_typeorm (37 records - FULL HISTORY):' as info;
SELECT COUNT(*) as count FROM migrations_typeorm;

SELECT 'migrations (2 records - INCOMPLETE):' as info;
SELECT COUNT(*) as count FROM migrations;

-- Step 2: Copy ALL records from migrations_typeorm to migrations
-- This will merge the full history
INSERT IGNORE INTO migrations (id, timestamp, name)
SELECT id, timestamp, name FROM migrations_typeorm;

-- Step 3: Verify merge
SELECT 'After merge - migrations should have 37 records:' as info;
SELECT COUNT(*) as count FROM migrations;

-- Step 4: Check for any missing records
SELECT 'Records in migrations_typeorm but not in migrations:' as info;
SELECT COUNT(*) FROM migrations_typeorm mt
WHERE NOT EXISTS (
  SELECT 1 FROM migrations m 
  WHERE m.name = mt.name
);

-- Step 5: Drop migrations_typeorm (no longer needed)
DROP TABLE migrations_typeorm;

-- Step 6: Final verification
SELECT 'Final state - only migrations table exists:' as info;
SHOW TABLES LIKE 'migration%';

SELECT 'Total migrations:' as info;
SELECT COUNT(*) as count FROM migrations;

SELECT '✅ Migration tables merged successfully!' as Status;
