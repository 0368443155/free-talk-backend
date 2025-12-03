import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreMeetingParticipants1733213600000 implements MigrationInterface {
    name = 'RestoreMeetingParticipants1733213600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const hasTable = await queryRunner.hasTable('meeting_participants');

        if (!hasTable) {
            console.log('Creating missing table: meeting_participants');

            // Get collation from meetings table to match
            const meetingsTable = await queryRunner.query("SHOW TABLE STATUS LIKE 'meetings'");
            const collation = meetingsTable[0]?.Collation || 'utf8mb4_unicode_ci';

            console.log(`Using collation: ${collation}`);

            await queryRunner.query(`
        CREATE TABLE \`meeting_participants\` (
          \`id\` varchar(36) NOT NULL, 
          \`role\` enum ('host', 'moderator', 'participant') NOT NULL DEFAULT 'participant', 
          \`is_muted\` tinyint NOT NULL DEFAULT 0, 
          \`is_video_off\` tinyint NOT NULL DEFAULT 0, 
          \`is_screen_sharing\` tinyint NOT NULL DEFAULT 0, 
          \`is_hand_raised\` tinyint NOT NULL DEFAULT 0, 
          \`is_kicked\` tinyint NOT NULL DEFAULT 0, 
          \`is_online\` tinyint NOT NULL DEFAULT 0, 
          \`joined_at\` timestamp NOT NULL, 
          \`left_at\` timestamp NULL, 
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), 
          \`meeting_id\` varchar(36) NULL, 
          \`user_id\` varchar(36) NULL, 
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}
      `);

            // Add Foreign Keys
            // Note: We use simple names to avoid conflict with existing constraints if any
            await queryRunner.query(`
        ALTER TABLE \`meeting_participants\` 
        ADD CONSTRAINT \`FK_meeting_participants_meeting_restore\` 
        FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);

            await queryRunner.query(`
        ALTER TABLE \`meeting_participants\` 
        ADD CONSTRAINT \`FK_meeting_participants_user_restore\` 
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
        } else {
            console.log('Table meeting_participants already exists');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
