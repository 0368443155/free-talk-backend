import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

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
    // Generate UUIDs in Node.js for compatibility
    const flags = [
      { id: randomUUID(), name: 'use_new_gateway', enabled: false, rollout_percentage: 0, description: 'Use new modular gateway instead of monolithic' },
      { id: randomUUID(), name: 'use_room_factory', enabled: false, rollout_percentage: 0, description: 'Use room factory for creating rooms' },
      { id: randomUUID(), name: 'use_feature_modules', enabled: false, rollout_percentage: 0, description: 'Use feature modules (chat, media, etc)' },
      { id: randomUUID(), name: 'use_access_control', enabled: false, rollout_percentage: 0, description: 'Use new access control system' },
      { id: randomUUID(), name: 'use_cqrs_pattern', enabled: false, rollout_percentage: 0, description: 'Use CQRS pattern for domain modules' },
    ];

    for (const flag of flags) {
      await queryRunner.query(`
        INSERT INTO \`feature_flags\` (\`id\`, \`name\`, \`enabled\`, \`rollout_percentage\`, \`description\`)
        VALUES (?, ?, ?, ?, ?)
      `, [flag.id, flag.name, flag.enabled, flag.rollout_percentage, flag.description]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('feature_flags');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE \`feature_flags\``);
    }
  }
}

