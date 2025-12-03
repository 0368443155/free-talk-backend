import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Phase1AutoScheduleFields1733213400000 implements MigrationInterface {
    name = 'Phase1AutoScheduleFields1733213400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper function to safely create index
        const createIndexSafe = async (sql: string) => {
            try {
                await queryRunner.query(sql);
            } catch (error: any) {
                // Ignore duplicate key name error (1061) or index already exists
                if (error.errno !== 1061 && error.code !== 'ER_DUP_KEYNAME') {
                    console.warn('Warning creating index:', error.message);
                }
            }
        };

        // Add Phase 1 fields to meetings table
        const meetingTable = await queryRunner.getTable('meetings');
        if (!meetingTable?.findColumnByName('meeting_state')) {
            await queryRunner.addColumn(
                'meetings',
                new TableColumn({
                    name: 'meeting_state',
                    type: 'varchar',
                    length: '50',
                    default: "'scheduled'",
                }),
            );
        }

        if (!meetingTable?.findColumnByName('auto_opened_at')) {
            await queryRunner.addColumn(
                'meetings',
                new TableColumn({
                    name: 'auto_opened_at',
                    type: 'timestamp',
                    isNullable: true,
                }),
            );
        }

        if (!meetingTable?.findColumnByName('auto_closed_at')) {
            await queryRunner.addColumn(
                'meetings',
                new TableColumn({
                    name: 'auto_closed_at',
                    type: 'timestamp',
                    isNullable: true,
                }),
            );
        }

        // Add Phase 1 fields to bookings table
        const bookingTable = await queryRunner.getTable('bookings');
        if (!bookingTable?.findColumnByName('reminder_sent_20min')) {
            await queryRunner.addColumn(
                'bookings',
                new TableColumn({
                    name: 'reminder_sent_20min',
                    type: 'boolean',
                    default: false,
                }),
            );
        }

        if (!bookingTable?.findColumnByName('reminder_sent_at')) {
            await queryRunner.addColumn(
                'bookings',
                new TableColumn({
                    name: 'reminder_sent_at',
                    type: 'timestamp',
                    precision: 6,
                    isNullable: true,
                }),
            );
        }

        // Add indexes for performance safely
        await createIndexSafe(`
      CREATE INDEX idx_meetings_state ON meetings(meeting_state)
    `);

        await createIndexSafe(`
      CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at)
    `);

        await createIndexSafe(`
      CREATE INDEX idx_bookings_reminder_20min 
      ON bookings(scheduled_at, reminder_sent_20min)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        try { await queryRunner.query(`DROP INDEX idx_meetings_state ON meetings`); } catch (e) { }
        try { await queryRunner.query(`DROP INDEX idx_meetings_scheduled_at ON meetings`); } catch (e) { }
        try { await queryRunner.query(`DROP INDEX idx_bookings_reminder_20min ON bookings`); } catch (e) { }

        // Drop columns from bookings
        const bookingTable = await queryRunner.getTable('bookings');
        if (bookingTable?.findColumnByName('reminder_sent_at')) {
            await queryRunner.dropColumn('bookings', 'reminder_sent_at');
        }
        if (bookingTable?.findColumnByName('reminder_sent_20min')) {
            await queryRunner.dropColumn('bookings', 'reminder_sent_20min');
        }

        // Drop columns from meetings
        const meetingTable = await queryRunner.getTable('meetings');
        if (meetingTable?.findColumnByName('auto_closed_at')) {
            await queryRunner.dropColumn('meetings', 'auto_closed_at');
        }
        if (meetingTable?.findColumnByName('auto_opened_at')) {
            await queryRunner.dropColumn('meetings', 'auto_opened_at');
        }
        if (meetingTable?.findColumnByName('meeting_state')) {
            await queryRunner.dropColumn('meetings', 'meeting_state');
        }
    }
}
