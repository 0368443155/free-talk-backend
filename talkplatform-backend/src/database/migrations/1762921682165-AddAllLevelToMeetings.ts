import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllLevelToMeetings1762921682165 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Modify the level enum to add 'all' option
        await queryRunner.query(`
            ALTER TABLE meetings 
            MODIFY COLUMN level ENUM('all', 'beginner', 'intermediate', 'advanced') NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert back to original enum without 'all'
        await queryRunner.query(`
            ALTER TABLE meetings 
            MODIFY COLUMN level ENUM('beginner', 'intermediate', 'advanced') NULL
        `);
    }

}
