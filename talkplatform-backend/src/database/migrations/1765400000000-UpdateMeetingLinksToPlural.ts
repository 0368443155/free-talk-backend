import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMeetingLinksToPlural1765400000000 implements MigrationInterface {
    name = 'UpdateMeetingLinksToPlural1765400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update meeting_link in lessons table from /meeting/ to /meetings/
        await queryRunner.query(`
            UPDATE lessons
            SET meeting_link = REPLACE(meeting_link, '/meeting/', '/meetings/')
            WHERE meeting_link LIKE '%/meeting/%'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert meeting_link in lessons table from /meetings/ back to /meeting/
        await queryRunner.query(`
            UPDATE lessons
            SET meeting_link = REPLACE(meeting_link, '/meetings/', '/meeting/')
            WHERE meeting_link LIKE '%/meetings/%'
        `);
    }
}

