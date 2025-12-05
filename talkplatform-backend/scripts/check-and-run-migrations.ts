/**
 * Script để kiểm tra và chạy migrations cho Phase 1
 * 
 * Usage: ts-node -r tsconfig-paths/register scripts/check-and-run-migrations.ts
 */

import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';

async function checkAndRunMigrations() {
  console.log('🔍 Checking migration status...\n');

  try {
    // 1. Initialize data source
    console.log('📦 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 2. Check migration tables
      console.log('📊 Checking migration tables...');
      
      const tables = await queryRunner.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE '%migration%'
      `);

      const migrationTableNames = tables.map((t: any) => t.TABLE_NAME);
      console.log(`Found migration tables: ${migrationTableNames.join(', ') || 'None'}\n`);

      // 3. Check if migrations table exists
      let migrationsTable = 'migrations';
      if (!migrationTableNames.includes('migrations')) {
        if (migrationTableNames.includes('migrations_typeorm')) {
          console.log('⚠️  Found migrations_typeorm but not migrations table');
          console.log('   Consider merging tables (see docs/Phase1_Booking_Class_System/Fix_Phase_1/)\n');
          migrationsTable = 'migrations_typeorm';
        } else {
          console.log('⚠️  No migration table found. TypeORM will create one.\n');
        }
      }

      // 4. Check existing migrations
      if (migrationTableNames.length > 0) {
        const existingMigrations = await queryRunner.query(`
          SELECT * FROM ${migrationsTable} 
          ORDER BY timestamp DESC 
          LIMIT 10
        `);
        
        console.log(`📋 Last ${existingMigrations.length} migrations:`);
        existingMigrations.forEach((m: any) => {
          const date = new Date(parseInt(m.timestamp)).toISOString();
          console.log(`   [${m.timestamp}] ${m.name} - ${date}`);
        });
        console.log('');
      }

      // 5. Check Phase 1 migrations
      console.log('🔍 Checking Phase 1 migrations...\n');
      
      const phase1Migrations = [
        { name: 'Phase1PerformanceImprovements1733212800000', timestamp: 1733212800000 },
        { name: 'AddMeetingStateTracking1733212800001', timestamp: 1733212800001 },
        { name: 'CreateMeetingParticipants1733212800002', timestamp: 1733212800002 },
        { name: 'AddBookingNotes1733212800003', timestamp: 1733212800003 },
        { name: 'AddNotificationStatusFields1733212800004', timestamp: 1733212800004 },
        { name: 'Phase1AutoScheduleFields1733213400000', timestamp: 1733213400000 },
      ];

      if (migrationTableNames.length > 0) {
        const allMigrations = await queryRunner.query(`SELECT name FROM ${migrationsTable}`);
        const executedNames = allMigrations.map((m: any) => m.name);

        console.log('Phase 1 Migration Status:');
        phase1Migrations.forEach(migration => {
          const isExecuted = executedNames.includes(migration.name);
          const status = isExecuted ? '✅' : '❌';
          console.log(`   ${status} ${migration.name}`);
        });
        console.log('');

        const pendingPhase1 = phase1Migrations.filter(
          m => !executedNames.includes(m.name)
        );

        if (pendingPhase1.length > 0) {
          console.log(`⚠️  Found ${pendingPhase1.length} pending Phase 1 migrations:`);
          pendingPhase1.forEach(m => console.log(`   - ${m.name}`));
          console.log('');
          console.log('💡 To run migrations, use: npm run migration:run\n');
        } else {
          console.log('✅ All Phase 1 migrations have been executed!\n');
        }
      } else {
        console.log('⚠️  No migration table found. All migrations are pending.\n');
      }

      // 6. Check for duplicate migration tables
      if (migrationTableNames.length > 1) {
        console.log('⚠️  WARNING: Multiple migration tables found!');
        console.log('   This can cause issues. Consider merging them.');
        console.log('   See: docs/Phase1_Booking_Class_System/Fix_Phase_1/MIGRATION_MERGE_GUIDE.md\n');
      }

    } finally {
      await queryRunner.release();
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure MySQL is running and check your .env file');
    }
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run the script
checkAndRunMigrations()
  .then(() => {
    console.log('✅ Migration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


