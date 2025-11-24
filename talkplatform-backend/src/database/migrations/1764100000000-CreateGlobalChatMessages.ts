import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlobalChatMessages1764100000000 implements MigrationInterface {
  name = 'CreateGlobalChatMessages1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('global_chat_messages');
    if (tableExists) {
      console.log('Table global_chat_messages already exists, skipping...');
      return;
    }

    // Create table using raw SQL
    await queryRunner.query(`
      CREATE TABLE \`global_chat_messages\` (
        \`id\` varchar(36) NOT NULL PRIMARY KEY,
        \`sender_id\` varchar(36) NULL,
        \`message\` text NOT NULL,
        \`type\` enum('text', 'system', 'reaction') NOT NULL DEFAULT 'text',
        \`metadata\` json NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`IDX_global_chat_messages_created_at\` (\`created_at\`),
        INDEX \`IDX_global_chat_messages_sender_created\` (\`sender_id\`, \`created_at\`),
        FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('global_chat_messages');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE \`global_chat_messages\``);
    }
  }
}

