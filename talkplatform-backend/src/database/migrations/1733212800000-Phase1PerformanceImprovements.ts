import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1PerformanceImprovements1733212800000 implements MigrationInterface {
    name = 'Phase1PerformanceImprovements1733212800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper function to check if index exists
        const indexExists = async (tableName: string, indexName: string): Promise<boolean> => {
            const result = await queryRunner.query(
                `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE table_schema = DATABASE() 
         AND table_name = ? 
         AND index_name = ?`,
                [tableName, indexName]
            );
            return result[0].count > 0;
        };

        // 1. Add indexes for meetings
        if (!(await indexExists('meetings', 'idx_meetings_status_scheduled_at'))) {
            await queryRunner.query(`
        CREATE INDEX idx_meetings_status_scheduled_at 
        ON meetings(status, scheduled_at)
      `);
        }

        if (!(await indexExists('meetings', 'idx_meetings_status_started_at'))) {
            await queryRunner.query(`
        CREATE INDEX idx_meetings_status_started_at 
        ON meetings(status, started_at)
      `);
        }

        if (!(await indexExists('meetings', 'idx_meetings_scheduled_at'))) {
            await queryRunner.query(`
        CREATE INDEX idx_meetings_scheduled_at 
        ON meetings(scheduled_at)
      `);
        }

        // 2. Add indexes for bookings
        if (!(await indexExists('bookings', 'idx_bookings_status_scheduled_at'))) {
            await queryRunner.query(`
        CREATE INDEX idx_bookings_status_scheduled_at 
        ON bookings(status, scheduled_at)
      `);
        }

        if (!(await indexExists('bookings', 'idx_bookings_meeting_id_status'))) {
            await queryRunner.query(`
        CREATE INDEX idx_bookings_meeting_id_status 
        ON bookings(meeting_id, status)
      `);
        }

        // 3. Add reminder fields to bookings
        const bookingTable = await queryRunner.getTable('bookings');

        if (!bookingTable?.findColumnByName('reminder_sent_20min')) {
            await queryRunner.query(`
        ALTER TABLE bookings 
        ADD COLUMN reminder_sent_20min BOOLEAN DEFAULT FALSE
      `);
        }

        if (!bookingTable?.findColumnByName('reminder_sent_at')) {
            await queryRunner.query(`
        ALTER TABLE bookings 
        ADD COLUMN reminder_sent_at TIMESTAMP(6) NULL
      `);
        }

        // 4. Add index for reminder tracking
        if (!(await indexExists('bookings', 'idx_bookings_reminder_20min'))) {
            await queryRunner.query(`
        CREATE INDEX idx_bookings_reminder_20min 
        ON bookings(scheduled_at, reminder_sent_20min, status)
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX idx_meetings_status_scheduled_at ON meetings`);
        await queryRunner.query(`DROP INDEX idx_meetings_status_started_at ON meetings`);
        await queryRunner.query(`DROP INDEX idx_meetings_scheduled_at ON meetings`);
        await queryRunner.query(`DROP INDEX idx_bookings_status_scheduled_at ON bookings`);
        await queryRunner.query(`DROP INDEX idx_bookings_meeting_id_status ON bookings`);
        await queryRunner.query(`DROP INDEX idx_bookings_reminder_20min ON bookings`);

        // Drop columns
        const bookingTable = await queryRunner.getTable('bookings');

        if (bookingTable?.findColumnByName('reminder_sent_20min')) {
            await queryRunner.query(`ALTER TABLE bookings DROP COLUMN reminder_sent_20min`);
        }

        if (bookingTable?.findColumnByName('reminder_sent_at')) {
            await queryRunner.query(`ALTER TABLE bookings DROP COLUMN reminder_sent_at`);
        }
    }
}
