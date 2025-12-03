import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Meeting State Tracking Migration
 * 
 * Thêm fields để track state của meetings:
 * - opened_at: Thời gian meeting được mở
 * - closed_at: Thời gian meeting được đóng
 * - auto_opened: True nếu mở tự động
 * - auto_closed: True nếu đóng tự động
 */
export class AddMeetingStateTracking1767000000001 implements MigrationInterface {
  name = 'AddMeetingStateTracking1767000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm state tracking fields
    await queryRunner.query(`
      ALTER TABLE meetings 
      ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP(6) NULL,
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP(6) NULL,
      ADD COLUMN IF NOT EXISTS auto_opened BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN DEFAULT FALSE;
    `);

    // Thêm indexes cho performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_opened_at 
      ON meetings(opened_at) 
      WHERE opened_at IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_closed_at 
      ON meetings(closed_at) 
      WHERE closed_at IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meetings_opened_at ON meetings;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meetings_closed_at ON meetings;`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE meetings 
      DROP COLUMN IF EXISTS opened_at,
      DROP COLUMN IF EXISTS closed_at,
      DROP COLUMN IF EXISTS auto_opened,
      DROP COLUMN IF EXISTS auto_closed;
    `);
  }
}

