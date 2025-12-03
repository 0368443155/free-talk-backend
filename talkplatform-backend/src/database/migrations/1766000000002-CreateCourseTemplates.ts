import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseTemplates1766000000002 implements MigrationInterface {
  name = 'CreateCourseTemplates1766000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('course_templates');
    if (tableExists) {
      console.log('Table course_templates already exists, skipping...');
      return;
    }

    // Create course_templates table
    await queryRunner.query(`
      CREATE TABLE \`course_templates\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`created_by\` varchar(36) NOT NULL,
        \`is_public\` boolean NOT NULL DEFAULT false,
        \`is_featured\` boolean NOT NULL DEFAULT false,
        \`category\` varchar(100) NULL,
        \`level\` varchar(50) NULL,
        \`language\` varchar(50) NULL,
        \`total_sessions\` int NOT NULL,
        \`sessions_per_week\` int NULL,
        \`total_duration_hours\` int NULL,
        \`session_structure\` json NOT NULL,
        \`lesson_structure\` json NULL,
        \`default_materials\` json NULL,
        \`suggested_price_full\` decimal(10,2) NULL,
        \`suggested_price_session\` decimal(10,2) NULL,
        \`usage_count\` int NOT NULL DEFAULT 0,
        \`rating\` decimal(3,2) NULL,
        \`total_ratings\` int NOT NULL DEFAULT 0,
        \`tags\` json NULL,
        \`thumbnail_url\` varchar(500) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`IDX_course_templates_category\` (\`category\`),
        INDEX \`IDX_course_templates_level\` (\`level\`),
        INDEX \`IDX_course_templates_is_public\` (\`is_public\`),
        INDEX \`IDX_course_templates_is_featured\` (\`is_featured\`),
        INDEX \`IDX_course_templates_created_by\` (\`created_by\`),
        INDEX \`IDX_course_templates_usage_count\` (\`usage_count\` DESC),
        INDEX \`IDX_course_templates_rating\` (\`rating\` DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create template_ratings table
    await queryRunner.query(`
      CREATE TABLE \`template_ratings\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`template_id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`rating\` int NOT NULL CHECK (\`rating\` BETWEEN 1 AND 5),
        \`review\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (\`template_id\`) REFERENCES \`course_templates\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_user_template\` (\`template_id\`, \`user_id\`),
        INDEX \`IDX_template_ratings_template\` (\`template_id\`),
        INDEX \`IDX_template_ratings_rating\` (\`rating\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create template_usage table
    await queryRunner.query(`
      CREATE TABLE \`template_usage\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`template_id\` varchar(36) NOT NULL,
        \`course_id\` varchar(36) NOT NULL,
        \`used_by\` varchar(36) NOT NULL,
        \`used_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (\`template_id\`) REFERENCES \`course_templates\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`used_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        INDEX \`IDX_template_usage_template\` (\`template_id\`),
        INDEX \`IDX_template_usage_used_by\` (\`used_by\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    const usageExists = await queryRunner.hasTable('template_usage');
    if (usageExists) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`template_usage\``);
    }

    const ratingsExists = await queryRunner.hasTable('template_ratings');
    if (ratingsExists) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`template_ratings\``);
    }

    const templatesExists = await queryRunner.hasTable('course_templates');
    if (templatesExists) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`course_templates\``);
    }
  }
}

