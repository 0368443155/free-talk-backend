import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlags1766000000001 implements MigrationInterface {
  name = 'CreateFeatureFlags1766000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('feature_flags');
    if (tableExists) {
      console.log('Table feature_flags already exists, skipping...');
      return;
    }

    // Create feature_flags table
    await queryRunner.query(`
      CREATE TABLE \`feature_flags\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`name\` varchar(100) NOT NULL UNIQUE,
        \`enabled\` boolean NOT NULL DEFAULT false,
        \`rollout_percentage\` int NOT NULL DEFAULT 0,
        \`description\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_feature_flags_name\` (\`name\`),
        INDEX \`IDX_feature_flags_enabled\` (\`enabled\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default feature flags
    await queryRunner.query(`
      INSERT INTO \`feature_flags\` (\`id\`, \`name\`, \`enabled\`, \`rollout_percentage\`, \`description\`)
      VALUES 
        (UUID(), 'use_new_gateway', false, 0, 'Use new modular gateway instead of monolithic'),
        (UUID(), 'use_room_factory', false, 0, 'Use room factory for creating rooms'),
        (UUID(), 'use_feature_modules', false, 0, 'Use feature modules (chat, media, etc)'),
        (UUID(), 'use_access_control', false, 0, 'Use new access control system'),
        (UUID(), 'use_cqrs_pattern', false, 0, 'Use CQRS pattern for domain modules')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('feature_flags');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE \`feature_flags\``);
    }
  }
}

