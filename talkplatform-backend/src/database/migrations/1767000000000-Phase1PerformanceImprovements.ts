import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 Performance Improvements Migration
 * 
 * Thêm indexes và fields cần thiết cho Phase 1 Booking & Class System:
 * 1. Indexes cho meetings (state, start_time, end_time)
 * 2. Indexes cho bookings (scheduled_at, status)
 * 3. Thêm field reminder_sent_20min cho bookings
 */
export class Phase1PerformanceImprovements1767000000000 implements MigrationInterface {
  name = 'Phase1PerformanceImprovements1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm indexes cho meetings để tối ưu cron job queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_status_scheduled_at 
      ON meetings(status, scheduled_at) 
      WHERE status = 'scheduled';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_status_started_at 
      ON meetings(status, started_at) 
      WHERE status IN ('live', 'scheduled');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at 
      ON meetings(scheduled_at) 
      WHERE scheduled_at IS NOT NULL;
    `);

    // 2. Thêm indexes cho bookings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status_scheduled_at 
      ON bookings(status, scheduled_at) 
      WHERE status = 'confirmed';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id_status 
      ON bookings(meeting_id, status);
    `);

    // 3. Thêm field reminder_sent_20min cho bookings
    await queryRunner.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS reminder_sent_20min BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP(6) NULL;
    `);

    // 4. Thêm index cho reminder queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_reminder_20min 
      ON bookings(scheduled_at, reminder_sent_20min, status) 
      WHERE status = 'confirmed' AND reminder_sent_20min = FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meetings_status_scheduled_at ON meetings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meetings_status_started_at ON meetings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meetings_scheduled_at ON meetings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_status_scheduled_at ON bookings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_meeting_id_status ON bookings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_reminder_20min ON bookings;`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE bookings 
      DROP COLUMN IF EXISTS reminder_sent_20min,
      DROP COLUMN IF EXISTS reminder_sent_at;
    `);
  }
}

