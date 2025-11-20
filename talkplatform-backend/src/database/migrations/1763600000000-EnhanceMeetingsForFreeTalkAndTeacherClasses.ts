import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceMeetingsForFreeTalkAndTeacherClasses1763600000000 implements MigrationInterface {
  name = 'EnhanceMeetingsForFreeTalkAndTeacherClasses1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to meetings table with ENUM values for MySQL
    await queryRunner.query(`
      ALTER TABLE \`meetings\` 
      ADD COLUMN \`meeting_type\` ENUM('free_talk', 'teacher_class', 'workshop', 'private_session') NOT NULL DEFAULT 'free_talk',
      ADD COLUMN \`price_credits\` int NOT NULL DEFAULT 0,
      ADD COLUMN \`pricing_type\` ENUM('free', 'credits', 'subscription') NOT NULL DEFAULT 'free',
      ADD COLUMN \`region\` varchar(100) NULL,
      ADD COLUMN \`tags\` json NULL,
      ADD COLUMN \`is_audio_first\` boolean NOT NULL DEFAULT true,
      ADD COLUMN \`requires_approval\` boolean NOT NULL DEFAULT false,
      ADD COLUMN \`affiliate_code\` varchar(500) NULL
    `);

    // Add indexes for better performance
    await queryRunner.query(`
      CREATE INDEX \`IDX_meetings_meeting_type\` ON \`meetings\` (\`meeting_type\`)
    `);
    
    await queryRunner.query(`
      CREATE INDEX \`IDX_meetings_region\` ON \`meetings\` (\`region\`)
    `);
    
    await queryRunner.query(`
      CREATE INDEX \`IDX_meetings_language_level\` ON \`meetings\` (\`language\`, \`level\`)
    `);
    
    await queryRunner.query(`
      CREATE INDEX \`IDX_meetings_status_room_status\` ON \`meetings\` (\`status\`, \`room_status\`)
    `);

    // Update existing meetings to have appropriate defaults for free talk
    await queryRunner.query(`
      UPDATE \`meetings\` 
      SET 
        \`meeting_type\` = 'free_talk',
        \`pricing_type\` = 'free',
        \`is_audio_first\` = true,
        \`max_participants\` = 4
      WHERE \`max_participants\` > 10
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX \`IDX_meetings_status_room_status\``);
    await queryRunner.query(`DROP INDEX \`IDX_meetings_language_level\``);
    await queryRunner.query(`DROP INDEX \`IDX_meetings_region\``);
    await queryRunner.query(`DROP INDEX \`IDX_meetings_meeting_type\``);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE \`meetings\` 
      DROP COLUMN \`meeting_type\`,
      DROP COLUMN \`price_credits\`,
      DROP COLUMN \`pricing_type\`,
      DROP COLUMN \`region\`,
      DROP COLUMN \`tags\`,
      DROP COLUMN \`is_audio_first\`,
      DROP COLUMN \`requires_approval\`,
      DROP COLUMN \`affiliate_code\`
    `);
  }
}