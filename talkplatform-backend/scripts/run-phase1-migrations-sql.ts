import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';

/**
 * Script để chạy Phase 1 migrations bằng SQL trực tiếp
 * 
 * Chạy: ts-node -r tsconfig-paths/register scripts/run-phase1-migrations-sql.ts
 */
async function runPhase1MigrationsSQL() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Check which migrations have already run
      const migrationsTable = await queryRunner.query(
        `SELECT name FROM migrations WHERE name IN (?, ?, ?, ?)`,
        [
          'Phase1PerformanceImprovements1767000000000',
          'AddMeetingStateTracking1767000000001',
          'AddBookingNotes1767000000002',
          'AddNotificationStatusFields1767000000003',
        ],
      );

      const executedMigrations = migrationsTable.map((row: any) => row.name);
      console.log('Executed migrations:', executedMigrations);

      // Check each migration individually
      const shouldRunMigration1 = !executedMigrations.includes('Phase1PerformanceImprovements1767000000000');
      const shouldRunMigration2 = !executedMigrations.includes('AddMeetingStateTracking1767000000001');
      const shouldRunMigration3 = !executedMigrations.includes('AddBookingNotes1767000000002');
      const shouldRunMigration4 = !executedMigrations.includes('AddNotificationStatusFields1767000000003');

      if (!shouldRunMigration1 && !shouldRunMigration2 && !shouldRunMigration3 && !shouldRunMigration4) {
        console.log('✅ All Phase 1 migrations already executed. Skipping...');
        return;
      }

      console.log('Running Phase 1 migrations...');

      // Migration 1: Phase1PerformanceImprovements
      if (shouldRunMigration1) {
        console.log('1. Adding indexes for meetings...');
      
      // Check and create indexes for meetings
      try {
        await queryRunner.query(`
          CREATE INDEX idx_meetings_status_scheduled_at 
          ON meetings(status, scheduled_at)
        `);
        console.log('  ✓ Created idx_meetings_status_scheduled_at');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_meetings_status_scheduled_at already exists');
      }

      try {
        await queryRunner.query(`
          CREATE INDEX idx_meetings_status_started_at 
          ON meetings(status, started_at)
        `);
        console.log('  ✓ Created idx_meetings_status_started_at');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_meetings_status_started_at already exists');
      }

      try {
        await queryRunner.query(`
          CREATE INDEX idx_meetings_scheduled_at 
          ON meetings(scheduled_at)
        `);
        console.log('  ✓ Created idx_meetings_scheduled_at');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_meetings_scheduled_at already exists');
      }

      console.log('2. Adding indexes for bookings...');
      
      try {
        await queryRunner.query(`
          CREATE INDEX idx_bookings_status_scheduled_at 
          ON bookings(status, scheduled_at)
        `);
        console.log('  ✓ Created idx_bookings_status_scheduled_at');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_bookings_status_scheduled_at already exists');
      }

      try {
        await queryRunner.query(`
          CREATE INDEX idx_bookings_meeting_id_status 
          ON bookings(meeting_id, status)
        `);
        console.log('  ✓ Created idx_bookings_meeting_id_status');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_bookings_meeting_id_status already exists');
      }

      console.log('3. Adding reminder fields to bookings...');
      
      // Check if columns exist
      const bookingColumns = await queryRunner.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME IN ('reminder_sent_20min', 'reminder_sent_at')
      `);

      const existingColumns = bookingColumns.map((row: any) => row.COLUMN_NAME);

      if (!existingColumns.includes('reminder_sent_20min')) {
        await queryRunner.query(`
          ALTER TABLE bookings 
          ADD COLUMN reminder_sent_20min BOOLEAN DEFAULT FALSE
        `);
        console.log('  ✓ Added reminder_sent_20min column');
      } else {
        console.log('  - Column reminder_sent_20min already exists');
      }

      if (!existingColumns.includes('reminder_sent_at')) {
        await queryRunner.query(`
          ALTER TABLE bookings 
          ADD COLUMN reminder_sent_at TIMESTAMP(6) NULL
        `);
        console.log('  ✓ Added reminder_sent_at column');
      } else {
        console.log('  - Column reminder_sent_at already exists');
      }

      try {
        await queryRunner.query(`
          CREATE INDEX idx_bookings_reminder_20min 
          ON bookings(scheduled_at, reminder_sent_20min, status)
        `);
        console.log('  ✓ Created idx_bookings_reminder_20min');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_KEYNAME') {
          throw e;
        }
        console.log('  - Index idx_bookings_reminder_20min already exists');
      }

        // Record migration 1
        await queryRunner.query(
          `INSERT INTO migrations (timestamp, name) VALUES (?, ?)`,
          [1767000000000, 'Phase1PerformanceImprovements1767000000000'],
        );
        console.log('  ✓ Recorded migration: Phase1PerformanceImprovements1767000000000');
      } else {
        console.log('1. Skipping Phase1PerformanceImprovements (already executed)');
      }

      // Migration 2: AddMeetingStateTracking
      if (shouldRunMigration2) {
        console.log('2. Adding state tracking fields to meetings...');
      
      const meetingColumns = await queryRunner.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'meetings' 
        AND COLUMN_NAME IN ('opened_at', 'closed_at', 'auto_opened', 'auto_closed')
      `);

      const existingMeetingColumns = meetingColumns.map((row: any) => row.COLUMN_NAME);

      if (!existingMeetingColumns.includes('opened_at')) {
        await queryRunner.query(`
          ALTER TABLE meetings 
          ADD COLUMN opened_at TIMESTAMP(6) NULL
        `);
        console.log('  ✓ Added opened_at column');
      } else {
        console.log('  - Column opened_at already exists');
      }

      if (!existingMeetingColumns.includes('closed_at')) {
        await queryRunner.query(`
          ALTER TABLE meetings 
          ADD COLUMN closed_at TIMESTAMP(6) NULL
        `);
        console.log('  ✓ Added closed_at column');
      } else {
        console.log('  - Column closed_at already exists');
      }

      if (!existingMeetingColumns.includes('auto_opened')) {
        await queryRunner.query(`
          ALTER TABLE meetings 
          ADD COLUMN auto_opened BOOLEAN DEFAULT FALSE
        `);
        console.log('  ✓ Added auto_opened column');
      } else {
        console.log('  - Column auto_opened already exists');
      }

      if (!existingMeetingColumns.includes('auto_closed')) {
        await queryRunner.query(`
          ALTER TABLE meetings 
          ADD COLUMN auto_closed BOOLEAN DEFAULT FALSE
        `);
        console.log('  ✓ Added auto_closed column');
      } else {
        console.log('  - Column auto_closed already exists');
      }

        console.log('3. Adding indexes for meeting state tracking...');
        
        try {
          await queryRunner.query(`
            CREATE INDEX idx_meetings_opened_at 
            ON meetings(opened_at)
          `);
          console.log('  ✓ Created idx_meetings_opened_at');
        } catch (e: any) {
          if (e.code !== 'ER_DUP_KEYNAME') {
            throw e;
          }
          console.log('  - Index idx_meetings_opened_at already exists');
        }

        try {
          await queryRunner.query(`
            CREATE INDEX idx_meetings_closed_at 
            ON meetings(closed_at)
          `);
          console.log('  ✓ Created idx_meetings_closed_at');
        } catch (e: any) {
          if (e.code !== 'ER_DUP_KEYNAME') {
            throw e;
          }
          console.log('  - Index idx_meetings_closed_at already exists');
        }

        // Record migration 2
        await queryRunner.query(
          `INSERT INTO migrations (timestamp, name) VALUES (?, ?)`,
          [1767000000001, 'AddMeetingStateTracking1767000000001'],
        );
        console.log('  ✓ Recorded migration: AddMeetingStateTracking1767000000001');
      } else {
        console.log('2. Skipping AddMeetingStateTracking (already executed)');
      }

      // Migration 3: AddBookingNotes
      if (shouldRunMigration3) {
        console.log('3. Adding notes fields to bookings...');
      
      const bookingNotesColumns = await queryRunner.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME IN ('student_notes', 'teacher_notes')
      `);

      const existingNotesColumns = bookingNotesColumns.map((row: any) => row.COLUMN_NAME);

      if (!existingNotesColumns.includes('student_notes')) {
        await queryRunner.query(`
          ALTER TABLE bookings 
          ADD COLUMN student_notes TEXT NULL
        `);
        console.log('  ✓ Added student_notes column');
      } else {
        console.log('  - Column student_notes already exists');
      }

      if (!existingNotesColumns.includes('teacher_notes')) {
        await queryRunner.query(`
          ALTER TABLE bookings 
          ADD COLUMN teacher_notes TEXT NULL
        `);
        console.log('  ✓ Added teacher_notes column');
      } else {
        console.log('  - Column teacher_notes already exists');
      }

        // Record migration 3
        await queryRunner.query(
          `INSERT INTO migrations (timestamp, name) VALUES (?, ?)`,
          [1767000000002, 'AddBookingNotes1767000000002'],
        );
        console.log('  ✓ Recorded migration: AddBookingNotes1767000000002');
      } else {
        console.log('3. Skipping AddBookingNotes (already executed)');
      }

      // Migration 4: AddNotificationStatusFields
      if (shouldRunMigration4) {
        console.log('4. Adding status and sent_at fields to notifications...');
        
        const notificationColumns = await queryRunner.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'notifications' 
          AND COLUMN_NAME IN ('status', 'sent_at')
        `);

        const existingNotificationColumns = notificationColumns.map((row: any) => row.COLUMN_NAME);

        if (!existingNotificationColumns.includes('status')) {
          await queryRunner.query(`
            ALTER TABLE notifications 
            ADD COLUMN status ENUM('pending', 'sent', 'failed') DEFAULT 'pending'
          `);
          console.log('  ✓ Added status column');
        } else {
          console.log('  - Column status already exists');
        }

        if (!existingNotificationColumns.includes('sent_at')) {
          await queryRunner.query(`
            ALTER TABLE notifications 
            ADD COLUMN sent_at TIMESTAMP(6) NULL
          `);
          console.log('  ✓ Added sent_at column');
        } else {
          console.log('  - Column sent_at already exists');
        }

        // Update type column from varchar to enum if needed
        const typeColumnInfo = await queryRunner.query(`
          SELECT COLUMN_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'notifications' 
          AND COLUMN_NAME = 'type'
        `);

        if (typeColumnInfo.length > 0 && !typeColumnInfo[0].COLUMN_TYPE.includes('enum')) {
          // Check if there's existing data
          const existingData = await queryRunner.query(`
            SELECT DISTINCT type FROM notifications WHERE type IS NOT NULL LIMIT 10
          `);
          
          // Update type column to enum
          await queryRunner.query(`
            ALTER TABLE notifications 
            MODIFY COLUMN type ENUM('email', 'in_app', 'push') NOT NULL
          `);
          console.log('  ✓ Updated type column to enum');
        } else {
          console.log('  - Column type is already enum or doesn\'t exist');
        }

        try {
          await queryRunner.query(`
            CREATE INDEX idx_notifications_status 
            ON notifications(status)
          `);
          console.log('  ✓ Created idx_notifications_status');
        } catch (e: any) {
          if (e.code !== 'ER_DUP_KEYNAME') {
            throw e;
          }
          console.log('  - Index idx_notifications_status already exists');
        }

        // Record migration 4
        await queryRunner.query(
          `INSERT INTO migrations (timestamp, name) VALUES (?, ?)`,
          [1767000000003, 'AddNotificationStatusFields1767000000003'],
        );
        console.log('  ✓ Recorded migration: AddNotificationStatusFields1767000000003');
      } else {
        console.log('4. Skipping AddNotificationStatusFields (already executed)');
      }

      console.log('\n✅ Phase 1 migrations completed successfully!');
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runPhase1MigrationsSQL();

