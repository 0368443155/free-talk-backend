import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add status and sent_at columns to notifications table
 * 
 * These columns are required for the Phase 1 notification system
 * to track notification status (pending, sent, failed) and when it was sent.
 */
export class AddNotificationStatusFields1767000000003 implements MigrationInterface {
  name = 'AddNotificationStatusFields1767000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications' 
      AND COLUMN_NAME IN ('status', 'sent_at')
    `);

    const existingColumns = columns.map((row: any) => row.COLUMN_NAME);

    // Add status column if it doesn't exist
    if (!existingColumns.includes('status')) {
      await queryRunner.query(`
        ALTER TABLE notifications 
        ADD COLUMN status ENUM('pending', 'sent', 'failed') DEFAULT 'pending'
      `);
      console.log('  ✓ Added status column');
    } else {
      console.log('  - Column status already exists');
    }

    // Add sent_at column if it doesn't exist
    if (!existingColumns.includes('sent_at')) {
      await queryRunner.query(`
        ALTER TABLE notifications 
        ADD COLUMN sent_at TIMESTAMP(6) NULL
      `);
      console.log('  ✓ Added sent_at column');
    } else {
      console.log('  - Column sent_at already exists');
    }

    // Add index for status if it doesn't exist
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_status ON notifications;`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE notifications 
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS sent_at;
    `);
  }
}






