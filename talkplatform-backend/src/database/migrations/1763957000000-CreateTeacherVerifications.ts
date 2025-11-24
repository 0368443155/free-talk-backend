import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeacherVerifications1763957000000 implements MigrationInterface {
  name = 'CreateTeacherVerifications1763957000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('teacher_verifications');
    if (tableExists) {
      console.log('Table teacher_verifications already exists, skipping...');
      return;
    }

    // Create table using raw SQL (like other migrations)
    await queryRunner.query(`
      CREATE TABLE \`teacher_verifications\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`user_id\` varchar(36) NOT NULL UNIQUE,
        \`status\` enum('pending', 'under_review', 'info_needed', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        \`documents\` json NULL,
        \`additional_info\` json NULL,
        \`admin_notes\` text NULL,
        \`rejection_reason\` text NULL,
        \`reviewed_by\` varchar(36) NULL,
        \`verified_at\` datetime(6) NULL,
        \`resubmission_count\` int NOT NULL DEFAULT 0,
        \`last_submitted_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_teacher_verifications_user_id\` (\`user_id\`),
        INDEX \`IDX_teacher_verifications_status\` (\`status\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('teacher_verifications');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE \`teacher_verifications\``);
    }
  }
}

