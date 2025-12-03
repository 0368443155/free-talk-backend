import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixMissingReviewColumns1733213500000 implements MigrationInterface {
    name = 'FixMissingReviewColumns1733213500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper function to check if column exists
        const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
            const result = await queryRunner.query(
                `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE table_schema = DATABASE() 
         AND table_name = ? 
         AND column_name = ?`,
                [tableName, columnName]
            );
            return result[0].count > 0;
        };

        // Check reviews table
        const hasReviewsTable = await queryRunner.hasTable('reviews');
        if (hasReviewsTable) {
            // Add is_hidden if missing
            if (!(await columnExists('reviews', 'is_hidden'))) {
                await queryRunner.addColumn(
                    'reviews',
                    new TableColumn({
                        name: 'is_hidden',
                        type: 'boolean',
                        default: false,
                    }),
                );
                console.log('✅ Added missing column: reviews.is_hidden');
            }
        }

        // Also check courses table for thumbnail_url (which caused error earlier)
        const hasCoursesTable = await queryRunner.hasTable('courses');
        if (hasCoursesTable) {
            if (!(await columnExists('courses', 'thumbnail_url'))) {
                await queryRunner.addColumn(
                    'courses',
                    new TableColumn({
                        name: 'thumbnail_url',
                        type: 'text',
                        isNullable: true,
                    }),
                );
                console.log('✅ Added missing column: courses.thumbnail_url');
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // We don't really want to drop these in down() if they are fixes
        // But for completeness:
        const hasReviewsTable = await queryRunner.hasTable('reviews');
        if (hasReviewsTable) {
            await queryRunner.dropColumn('reviews', 'is_hidden');
        }
    }
}
