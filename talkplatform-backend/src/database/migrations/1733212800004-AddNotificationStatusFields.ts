import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationStatusFields1733212800004 implements MigrationInterface {
  name = 'AddNotificationStatusFields1733212800004';

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

    const notificationTable = await queryRunner.getTable('notifications');

    // Add status column
    if (!notificationTable?.findColumnByName('status')) {
      await queryRunner.query(`
        ALTER TABLE notifications 
        ADD COLUMN status ENUM('pending', 'sent', 'failed') DEFAULT 'pending'
      `);
    }

    // Add sent_at column
    if (!notificationTable?.findColumnByName('sent_at')) {
      await queryRunner.query(`
        ALTER TABLE notifications 
        ADD COLUMN sent_at TIMESTAMP(6) NULL
      `);
    }

    // Update type column to enum if it's varchar
    const typeColumn = notificationTable?.findColumnByName('type');
    if (typeColumn && typeColumn.type !== 'enum') {
      await queryRunner.query(`
        ALTER TABLE notifications 
        MODIFY COLUMN type ENUM('email', 'in_app', 'push') NOT NULL
      `);
    }

    // Add indexes
    if (!(await indexExists('notifications', 'idx_notifications_status'))) {
      await queryRunner.query(`
        CREATE INDEX idx_notifications_status 
        ON notifications(status)
      `);
    }

    if (!(await indexExists('notifications', 'idx_notifications_user_status'))) {
      await queryRunner.query(`
        CREATE INDEX idx_notifications_user_status 
        ON notifications(user_id, status)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_notifications_status ON notifications`);
    await queryRunner.query(`DROP INDEX idx_notifications_user_status ON notifications`);

    // Drop columns
    const notificationTable = await queryRunner.getTable('notifications');

    if (notificationTable?.findColumnByName('status')) {
      await queryRunner.query(`ALTER TABLE notifications DROP COLUMN status`);
    }

    if (notificationTable?.findColumnByName('sent_at')) {
      await queryRunner.query(`ALTER TABLE notifications DROP COLUMN sent_at`);
    }

    // Revert type column to varchar
    await queryRunner.query(`
      ALTER TABLE notifications 
      MODIFY COLUMN type VARCHAR(50) NOT NULL
    `);
  }
}
