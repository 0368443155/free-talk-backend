# PHASE 2 - MIGRATION GUIDE CHI TIẾT

**Ngày tạo:** 03/12/2025  
**Mục đích:** Hướng dẫn chi tiết cách tạo và chạy migrations cho Phase 2  
**Trạng thái:** ✅ Ready to Use

---

## 📋 TỔNG QUAN

Phase 2 cần 2 migrations chính:
1. **Fix Referrer Column** - Fix typo và chuẩn hóa type
2. **Add Payment Status** - Thêm payment tracking vào Meeting entity

---

## 1. MIGRATION 1: FIX REFERRER COLUMN

### Mục đích

Fix typo `refferrer_id` → `referrer_id` và chuẩn hóa type từ `char(36)` → `uuid`.

### Tạo Migration File

```bash
cd talkplatform-backend
npm run migration:create src/database/migrations/FixReferrerColumn
```

Hoặc tạo thủ công file: `src/database/migrations/[TIMESTAMP]-FixReferrerColumn.ts`

### Migration Code Chi Tiết

```typescript
import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class FixReferrerColumn[TIMESTAMP] implements MigrationInterface {
    name = 'FixReferrerColumn[TIMESTAMP]';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('users');
        
        // Step 1: Check if old column exists
        const oldColumn = table?.findColumnByName('refferrer_id');
        const newColumn = table?.findColumnByName('referrer_id');
        
        // Step 2: Handle column rename/creation
        if (oldColumn && !newColumn) {
            // Case 1: Old column exists, new doesn't - Rename
            await queryRunner.renameColumn('users', 'refferrer_id', 'referrer_id');
            
            // Change type from char(36) to uuid
            await queryRunner.changeColumn('users', 'referrer_id', new TableColumn({
                name: 'referrer_id',
                type: 'uuid',
                isNullable: true,
            }));
        } else if (!oldColumn && !newColumn) {
            // Case 2: Neither exists - Create new
            await queryRunner.addColumn('users', new TableColumn({
                name: 'referrer_id',
                type: 'uuid',
                isNullable: true,
            }));
        } else if (newColumn && newColumn.type !== 'uuid') {
            // Case 3: New exists but wrong type - Change type
            await queryRunner.changeColumn('users', 'referrer_id', new TableColumn({
                name: 'referrer_id',
                type: 'uuid',
                isNullable: true,
            }));
        }

        // Step 3: Drop old index if exists
        const oldIndex = table?.indices.find(idx => idx.columnNames.includes('refferrer_id'));
        if (oldIndex) {
            await queryRunner.dropIndex('users', oldIndex.name);
        }

        // Step 4: Create new index if not exists
        const indexExists = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE table_schema = DATABASE() 
            AND table_name = 'users' 
            AND index_name = 'IDX_USERS_REFERRER_ID'
        `);
        
        if (indexExists[0].count === 0) {
            await queryRunner.createIndex('users', new TableIndex({
                name: 'IDX_USERS_REFERRER_ID',
                columnNames: ['referrer_id'],
            }));
        }

        // Step 5: Create foreign key if not exists
        const fkExists = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE table_schema = DATABASE() 
            AND table_name = 'users' 
            AND constraint_name = 'FK_USERS_REFERRER'
        `);
        
        if (fkExists[0].count === 0) {
            await queryRunner.createForeignKey('users', new TableForeignKey({
                name: 'FK_USERS_REFERRER',
                columnNames: ['referrer_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL', // Nếu người giới thiệu bị xóa, set null
            }));
        }

        // Step 6: Add self-referencing relations (via entity, not migration)
        // Note: Relations are handled in entity code, not migrations
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        const table = await queryRunner.getTable('users');
        const fk = table?.foreignKeys.find(fk => fk.name === 'FK_USERS_REFERRER');
        if (fk) {
            await queryRunner.dropForeignKey('users', fk);
        }

        // Drop index
        const indexExists = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE table_schema = DATABASE() 
            AND table_name = 'users' 
            AND index_name = 'IDX_USERS_REFERRER_ID'
        `);
        
        if (indexExists[0].count > 0) {
            await queryRunner.dropIndex('users', 'IDX_USERS_REFERRER_ID');
        }

        // Rename back (optional - might want to keep new name)
        const newColumn = table?.findColumnByName('referrer_id');
        if (newColumn) {
            await queryRunner.renameColumn('users', 'referrer_id', 'refferrer_id');
        }
    }
}
```

### Lưu ý quan trọng

1. **Data Preservation:** Migration này sẽ preserve data khi rename column
2. **Type Conversion:** MySQL/PostgreSQL sẽ tự convert char(36) → uuid nếu format hợp lệ
3. **Foreign Key:** Sẽ tạo constraint để đảm bảo referrer_id luôn trỏ đến user hợp lệ
4. **Rollback:** Down migration có thể rollback nếu cần

---

## 2. MIGRATION 2: ADD PAYMENT STATUS

### Mục đích

Thêm payment status tracking vào Meeting entity để tránh duplicate processing.

### Migration Code

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentStatusToMeetings[TIMESTAMP] implements MigrationInterface {
    name = 'AddPaymentStatusToMeetings[TIMESTAMP]';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('meetings');
        
        // Step 1: Add payment_status enum column
        if (!table?.findColumnByName('payment_status')) {
            // For MySQL, create enum type first
            await queryRunner.query(`
                ALTER TABLE meetings 
                ADD COLUMN payment_status ENUM('pending', 'processing', 'completed', 'failed', 'partial') 
                DEFAULT 'pending'
            `);
        }

        // Step 2: Add payment_processed_at
        if (!table?.findColumnByName('payment_processed_at')) {
            await queryRunner.addColumn('meetings', new TableColumn({
                name: 'payment_processed_at',
                type: 'timestamp',
                isNullable: true,
            }));
        }

        // Step 3: Add payment_metadata (JSON)
        if (!table?.findColumnByName('payment_metadata')) {
            await queryRunner.addColumn('meetings', new TableColumn({
                name: 'payment_metadata',
                type: 'json',
                isNullable: true,
            }));
        }

        // Step 4: Add index for querying pending payments
        const indexExists = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE table_schema = DATABASE() 
            AND table_name = 'meetings' 
            AND index_name = 'IDX_MEETINGS_PAYMENT_STATUS'
        `);
        
        if (indexExists[0].count === 0) {
            await queryRunner.query(`
                CREATE INDEX IDX_MEETINGS_PAYMENT_STATUS 
                ON meetings(payment_status, ended_at)
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`
            DROP INDEX IF EXISTS IDX_MEETINGS_PAYMENT_STATUS ON meetings
        `);

        // Drop columns
        const table = await queryRunner.getTable('meetings');
        
        if (table?.findColumnByName('payment_metadata')) {
            await queryRunner.dropColumn('meetings', 'payment_metadata');
        }
        
        if (table?.findColumnByName('payment_processed_at')) {
            await queryRunner.dropColumn('meetings', 'payment_processed_at');
        }
        
        if (table?.findColumnByName('payment_status')) {
            await queryRunner.dropColumn('meetings', 'payment_status');
        }
    }
}
```

---

## 3. VERIFICATION STEPS

### Sau khi chạy migrations

#### 1. Verify Database Schema

```sql
-- Check users table
DESCRIBE users;
-- Should see: referrer_id (uuid, nullable)

-- Check indexes
SHOW INDEXES FROM users WHERE Key_name LIKE '%REFERRER%';
-- Should see: IDX_USERS_REFERRER_ID

-- Check foreign keys
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'users' 
AND CONSTRAINT_NAME = 'FK_USERS_REFERRER';

-- Check meetings table
DESCRIBE meetings;
-- Should see: payment_status, payment_processed_at, payment_metadata
```

#### 2. Verify Data Integrity

```sql
-- Check if any referrer_id values are invalid
SELECT u1.id, u1.referrer_id, u2.id as referrer_exists
FROM users u1
LEFT JOIN users u2 ON u1.referrer_id = u2.id
WHERE u1.referrer_id IS NOT NULL 
AND u2.id IS NULL;
-- Should return 0 rows (all referrers should exist)

-- Check payment_status values
SELECT payment_status, COUNT(*) as count
FROM meetings
GROUP BY payment_status;
-- Should show distribution of payment statuses
```

---

## 4. ROLLBACK PROCEDURE

### Nếu cần rollback

```bash
# Rollback last migration
npm run migration:revert

# Or manually in SQL
-- Rollback FixReferrerColumn (if needed)
ALTER TABLE users RENAME COLUMN referrer_id TO refferrer_id;
ALTER TABLE users MODIFY COLUMN refferrer_id CHAR(36);
```

---

## 5. TESTING MIGRATIONS

### Test Script

```typescript
// scripts/test-phase2-migrations.ts
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';

async function testMigrations() {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    
    try {
        // Test 1: Check column exists
        const usersTable = await queryRunner.getTable('users');
        const referrerColumn = usersTable?.findColumnByName('referrer_id');
        console.log('✅ Referrer column:', referrerColumn ? 'EXISTS' : 'MISSING');
        
        // Test 2: Check foreign key
        const fks = usersTable?.foreignKeys.filter(fk => fk.name === 'FK_USERS_REFERRER');
        console.log('✅ Foreign key:', fks && fks.length > 0 ? 'EXISTS' : 'MISSING');
        
        // Test 3: Check payment status
        const meetingsTable = await queryRunner.getTable('meetings');
        const paymentStatusColumn = meetingsTable?.findColumnByName('payment_status');
        console.log('✅ Payment status:', paymentStatusColumn ? 'EXISTS' : 'MISSING');
        
    } finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}

testMigrations();
```

---

**Created by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0

