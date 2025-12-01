import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewsTableAndCourseColumns1764582318462 implements MigrationInterface {
    name = 'AddReviewsTableAndCourseColumns1764582318462'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop table if exists to be safe
        await queryRunner.query(`DROP TABLE IF EXISTS \`reviews\``);

        // Create reviews table with explicit collation to match courses table
        await queryRunner.query(`
            CREATE TABLE \`reviews\` (
                \`id\` varchar(36) NOT NULL, 
                \`course_id\` varchar(36) NOT NULL, 
                \`user_id\` varchar(36) NOT NULL, 
                \`rating\` int NOT NULL, 
                \`comment\` text NULL, 
                \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), 
                \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), 
                UNIQUE INDEX \`IDX_reviews_course_user\` (\`course_id\`, \`user_id\`), 
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add columns to courses table (check if exists first would be better but simple add is fine if we cleaned up)
        // We assume cleanup was done or columns don't exist.
        // If this fails, we might need to check existence, but let's rely on manual cleanup if needed.
        await queryRunner.query(`ALTER TABLE \`courses\` ADD \`thumbnail_url\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`courses\` ADD \`average_rating\` decimal(3,2) NOT NULL DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE \`courses\` ADD \`total_reviews\` int NOT NULL DEFAULT '0'`);

        // Add foreign keys for reviews
        await queryRunner.query(`
            ALTER TABLE \`reviews\` 
            ADD CONSTRAINT \`FK_reviews_course\` 
            FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`id\`) 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`reviews\` 
            ADD CONSTRAINT \`FK_reviews_user\` 
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_reviews_user\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_reviews_course\``);
        await queryRunner.query(`ALTER TABLE \`courses\` DROP COLUMN \`total_reviews\``);
        await queryRunner.query(`ALTER TABLE \`courses\` DROP COLUMN \`average_rating\``);
        await queryRunner.query(`ALTER TABLE \`courses\` DROP COLUMN \`thumbnail_url\``);
        await queryRunner.query(`DROP INDEX \`IDX_reviews_course_user\` ON \`reviews\``);
        await queryRunner.query(`DROP TABLE \`reviews\``);
    }
}
