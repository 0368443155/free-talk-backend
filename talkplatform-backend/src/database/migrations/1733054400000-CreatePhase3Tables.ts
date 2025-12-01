import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase3Tables1733054400000 implements MigrationInterface {
  name = 'CreatePhase3Tables1733054400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const transactionsExists = await queryRunner.hasTable('transactions');
    const withdrawalsExists = await queryRunner.hasTable('withdrawals');
    const attendanceRecordsExists = await queryRunner.hasTable('attendance_records');

    // 1. Create transactions table
    if (!transactionsExists) {
      await queryRunner.query(`
        CREATE TABLE \`transactions\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`user_id\` VARCHAR(36) NOT NULL,
          \`type\` VARCHAR(50) NOT NULL,
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`balance_before\` DECIMAL(10,2) NOT NULL,
          \`balance_after\` DECIMAL(10,2) NOT NULL,
          \`status\` VARCHAR(50) DEFAULT 'pending',
          \`reference_type\` VARCHAR(50) NULL,
          \`reference_id\` VARCHAR(36) NULL,
          \`description\` TEXT NULL,
          \`metadata\` JSON NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`completed_at\` TIMESTAMP NULL,
          INDEX \`idx_user\` (\`user_id\`),
          INDEX \`idx_type\` (\`type\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 2. Create withdrawals table
    if (!withdrawalsExists) {
      await queryRunner.query(`
        CREATE TABLE \`withdrawals\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`teacher_id\` VARCHAR(36) NOT NULL,
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`status\` VARCHAR(50) DEFAULT 'pending',
          \`bank_account_info\` JSON NOT NULL,
          \`requested_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`processed_at\` TIMESTAMP NULL,
          \`completed_at\` TIMESTAMP NULL,
          \`notes\` TEXT NULL,
          \`admin_notes\` TEXT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_teacher\` (\`teacher_id\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_requested_at\` (\`requested_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 3. Create attendance_records table
    if (!attendanceRecordsExists) {
      await queryRunner.query(`
        CREATE TABLE \`attendance_records\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`session_id\` VARCHAR(36) NOT NULL,
          \`user_id\` VARCHAR(36) NOT NULL,
          \`joined_at\` TIMESTAMP NULL,
          \`left_at\` TIMESTAMP NULL,
          \`duration_minutes\` INT DEFAULT 0,
          \`attendance_percentage\` DECIMAL(5,2) DEFAULT 0,
          \`status\` VARCHAR(50) DEFAULT 'absent',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY \`unique_session_user\` (\`session_id\`, \`user_id\`),
          INDEX \`idx_session\` (\`session_id\`),
          INDEX \`idx_user\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`attendance_records\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`withdrawals\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`transactions\``);
  }
}

