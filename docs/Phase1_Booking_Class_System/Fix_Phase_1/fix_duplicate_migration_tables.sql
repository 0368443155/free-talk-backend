-- CRITICAL: Fix Duplicate Migration Tables Issue
-- There are 2 migration tables: migrations and migrations_typeorm

USE talkplatform;

-- Step 1: Check both tables
SELECT 'migrations table:' as info;
SELECT COUNT(*) as count FROM migrations;

SELECT 'migrations_typeorm table:' as info;
SELECT COUNT(*) as count FROM migrations_typeorm;

-- Step 2: See what's in migrations_typeorm
SELECT * FROM migrations_typeorm ORDER BY timestamp DESC LIMIT 10;

-- Step 3: Decide which table to keep
-- Option A: Keep 'migrations' table (recommended - it has your data)
-- Option B: Keep 'migrations_typeorm' table

-- Step 4: If migrations_typeorm is empty or has wrong data, drop it
-- DROP TABLE migrations_typeorm;

-- Step 5: Rename migrations to migrations_typeorm (TypeORM expects this name)
-- RENAME TABLE migrations TO migrations_typeorm;

SELECT '⚠️ DO NOT RUN ALL AT ONCE - Read and execute step by step!' as WARNING;
