import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCollationMismatch1733213700000 implements MigrationInterface {
    name = 'FixCollationMismatch1733213700000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Standardize meeting_participants to utf8mb4_unicode_ci to match meetings and users tables

        console.log('Fixing collation mismatch for meeting_participants...');

        // Convert meeting_participants table
        await queryRunner.query(`
      ALTER TABLE \`meeting_participants\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

        console.log('✅ meeting_participants collation updated to utf8mb4_unicode_ci');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No easy revert needed
    }
}
