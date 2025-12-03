-- Check Table and Column Collations
SELECT 
    TABLE_NAME, 
    TABLE_COLLATION 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'talkplatform' 
AND TABLE_NAME IN ('meetings', 'users', 'meeting_participants');

SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    COLLATION_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'talkplatform' 
AND TABLE_NAME IN ('meetings', 'users', 'meeting_participants')
AND DATA_TYPE IN ('varchar', 'text', 'char', 'enum');
