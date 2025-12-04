import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParticipantFields1733213800000 implements MigrationInterface {
    name = 'AddParticipantFields1733213800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns exist before adding to avoid errors
        const table = await queryRunner.getTable('meeting_participants');

        if (!table?.findColumnByName('role')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN role ENUM('host', 'moderator', 'participant') DEFAULT 'participant'
      `);
        }

        if (!table?.findColumnByName('is_online')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN is_online BOOLEAN DEFAULT false
      `);
        }

        if (!table?.findColumnByName('is_muted')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN is_muted BOOLEAN DEFAULT false
      `);
        }

        if (!table?.findColumnByName('is_video_off')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN is_video_off BOOLEAN DEFAULT false
      `);
        }

        if (!table?.findColumnByName('is_hand_raised')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN is_hand_raised BOOLEAN DEFAULT false
      `);
        }

        if (!table?.findColumnByName('is_kicked')) {
            await queryRunner.query(`
        ALTER TABLE meeting_participants 
        ADD COLUMN is_kicked BOOLEAN DEFAULT false
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('meeting_participants');

        if (table?.findColumnByName('is_kicked')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN is_kicked`);
        if (table?.findColumnByName('is_hand_raised')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN is_hand_raised`);
        if (table?.findColumnByName('is_video_off')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN is_video_off`);
        if (table?.findColumnByName('is_muted')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN is_muted`);
        if (table?.findColumnByName('is_online')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN is_online`);
        if (table?.findColumnByName('role')) await queryRunner.query(`ALTER TABLE meeting_participants DROP COLUMN role`);
    }
}
