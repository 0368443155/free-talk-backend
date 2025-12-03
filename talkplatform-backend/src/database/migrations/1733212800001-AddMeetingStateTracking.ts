import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingStateTracking1733212800001 implements MigrationInterface {
  name = 'AddMeetingStateTracking1733212800001';

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

    const meetingTable = await queryRunner.getTable('meetings');

    // Add state tracking fields
    if (!meetingTable?.findColumnByName('state')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN state VARCHAR(50) DEFAULT 'scheduled'
      `);
    }

    if (!meetingTable?.findColumnByName('opened_at')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN opened_at TIMESTAMP(6) NULL
      `);
    }

    if (!meetingTable?.findColumnByName('closed_at')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN closed_at TIMESTAMP(6) NULL
      `);
    }

    if (!meetingTable?.findColumnByName('auto_opened')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN auto_opened BOOLEAN DEFAULT FALSE
      `);
    }

    if (!meetingTable?.findColumnByName('auto_closed')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN auto_closed BOOLEAN DEFAULT FALSE
      `);
    }

    if (!meetingTable?.findColumnByName('requires_manual_review')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN requires_manual_review BOOLEAN DEFAULT FALSE
      `);
    }

    if (!meetingTable?.findColumnByName('review_reason')) {
      await queryRunner.query(`
        ALTER TABLE meetings 
        ADD COLUMN review_reason VARCHAR(500) NULL
      `);
    }

    // Add indexes (using correct column names: scheduled_at, started_at, ended_at)
    if (!(await indexExists('meetings', 'idx_meetings_state'))) {
      await queryRunner.query(`
        CREATE INDEX idx_meetings_state 
        ON meetings(state)
      `);
    }

    if (!(await indexExists('meetings', 'idx_meetings_opened_at'))) {
      await queryRunner.query(`
        CREATE INDEX idx_meetings_opened_at 
        ON meetings(opened_at)
      `);
    }

    if (!(await indexExists('meetings', 'idx_meetings_closed_at'))) {
      await queryRunner.query(`
        CREATE INDEX idx_meetings_closed_at 
        ON meetings(closed_at)
      `);
    }

    // Composite indexes for performance (using scheduled_at, started_at)
    if (!(await indexExists('meetings', 'idx_meetings_state_scheduled_at'))) {
      await queryRunner.query(`
        CREATE INDEX idx_meetings_state_scheduled_at 
        ON meetings(state, scheduled_at)
      `);
    }

    if (!(await indexExists('meetings', 'idx_meetings_state_started_at'))) {
      await queryRunner.query(`
        CREATE INDEX idx_meetings_state_started_at 
        ON meetings(state, started_at)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_meetings_state ON meetings`);
    await queryRunner.query(`DROP INDEX idx_meetings_opened_at ON meetings`);
    await queryRunner.query(`DROP INDEX idx_meetings_closed_at ON meetings`);
    await queryRunner.query(`DROP INDEX idx_meetings_state_scheduled_at ON meetings`);
    await queryRunner.query(`DROP INDEX idx_meetings_state_started_at ON meetings`);

    // Drop columns
    const meetingTable = await queryRunner.getTable('meetings');

    if (meetingTable?.findColumnByName('state')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN state`);
    }

    if (meetingTable?.findColumnByName('opened_at')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN opened_at`);
    }

    if (meetingTable?.findColumnByName('closed_at')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN closed_at`);
    }

    if (meetingTable?.findColumnByName('auto_opened')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN auto_opened`);
    }

    if (meetingTable?.findColumnByName('auto_closed')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN auto_closed`);
    }

    if (meetingTable?.findColumnByName('requires_manual_review')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN requires_manual_review`);
    }

    if (meetingTable?.findColumnByName('review_reason')) {
      await queryRunner.query(`ALTER TABLE meetings DROP COLUMN review_reason`);
    }
  }
}
