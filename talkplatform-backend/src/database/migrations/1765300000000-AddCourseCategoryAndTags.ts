import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCourseCategoryAndTags1765300000000 implements MigrationInterface {
    name = 'AddCourseCategoryAndTags1765300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add tags column
        const tagsColumnExists = await queryRunner.hasColumn('courses', 'tags');
        if (!tagsColumnExists) {
            await queryRunner.addColumn(
                'courses',
                new TableColumn({
                    name: 'tags',
                    type: 'json',
                    isNullable: true,
                })
            );
        }

        // Change category from varchar to enum
        // Check if category column exists
        const categoryColumnExists = await queryRunner.hasColumn('courses', 'category');
        
        if (categoryColumnExists) {
            // First, update any existing category values that don't match the enum
            // Set invalid values to NULL or 'Other'
            const validCategories = [
                'English', 'Marketing', 'Business', 'Technology', 'Design',
                'Health', 'Fitness', 'Music', 'Arts', 'Science',
                'Mathematics', 'Languages', 'Other'
            ];
            
            // Update any category values that are not in the valid list to 'Other'
            await queryRunner.query(`
                UPDATE courses 
                SET category = 'Other' 
                WHERE category IS NOT NULL 
                AND category NOT IN (${validCategories.map(cat => `'${cat}'`).join(', ')})
            `);

            // Now change the column type to ENUM
            // For MySQL/MariaDB, we need to alter the column type
            await queryRunner.query(`
                ALTER TABLE courses 
                MODIFY COLUMN category ENUM(
                    'English',
                    'Marketing',
                    'Business',
                    'Technology',
                    'Design',
                    'Health',
                    'Fitness',
                    'Music',
                    'Arts',
                    'Science',
                    'Mathematics',
                    'Languages',
                    'Other'
                ) NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove tags column
        const tagsColumnExists = await queryRunner.hasColumn('courses', 'tags');
        if (tagsColumnExists) {
            await queryRunner.dropColumn('courses', 'tags');
        }

        // Revert category to varchar
        await queryRunner.query(`
            ALTER TABLE courses 
            MODIFY COLUMN category VARCHAR(100) NULL
        `);
    }
}

