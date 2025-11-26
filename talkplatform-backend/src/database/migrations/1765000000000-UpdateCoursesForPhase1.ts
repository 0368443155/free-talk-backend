import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class UpdateCoursesForPhase11765000000000 implements MigrationInterface {
    name = 'UpdateCoursesForPhase11765000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper function to check if column exists
        const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
            const result = await queryRunner.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE() 
                AND table_name = ? 
                AND column_name = ?
            `, [tableName, columnName]);
            return Number(result[0]?.count || 0) > 0;
        };

        // Helper function to check if index exists
        const indexExists = async (tableName: string, indexName: string): Promise<boolean> => {
            const result = await queryRunner.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.statistics 
                WHERE table_schema = DATABASE() 
                AND table_name = ? 
                AND index_name = ?
            `, [tableName, indexName]);
            return Number(result[0]?.count || 0) > 0;
        };

        // ==================== COURSES TABLE UPDATES ====================

        // Add is_published column to courses
        if (!(await columnExists('courses', 'is_published'))) {
            await queryRunner.addColumn(
                'courses',
                new TableColumn({
                    name: 'is_published',
                    type: 'boolean',
                    default: false,
                }),
            );
        }

        // Update status default from 'upcoming' to 'draft'
        await queryRunner.query(`
            ALTER TABLE \`courses\` 
            MODIFY COLUMN \`status\` varchar(50) DEFAULT 'draft' 
            COMMENT 'draft, published, archived'
        `);

        // Update existing 'upcoming' status to 'draft'
        await queryRunner.query(`
            UPDATE \`courses\` 
            SET \`status\` = 'draft' 
            WHERE \`status\` = 'upcoming'
        `);

        // Add index for category
        if (!(await indexExists('courses', 'idx_courses_category'))) {
            await queryRunner.createIndex(
                'courses',
                new TableIndex({
                    name: 'idx_courses_category',
                    columnNames: ['category'],
                }),
            );
        }

        // Add index for is_published
        if (!(await indexExists('courses', 'idx_courses_is_published'))) {
            await queryRunner.createIndex(
                'courses',
                new TableIndex({
                    name: 'idx_courses_is_published',
                    columnNames: ['is_published'],
                }),
            );
        }

        // Remove constraint total_sessions > 0 (allow 0 sessions)
        try {
            await queryRunner.query(`
                ALTER TABLE \`courses\` 
                DROP CONSTRAINT \`valid_sessions\`
            `);
        } catch (error) {
            // Constraint might not exist, ignore
            console.log('Constraint valid_sessions might not exist, skipping...');
        }

        // ==================== COURSE_SESSIONS TABLE UPDATES ====================

        // Add meeting_link column
        if (!(await columnExists('course_sessions', 'meeting_link'))) {
            await queryRunner.addColumn(
                'course_sessions',
                new TableColumn({
                    name: 'meeting_link',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                }),
            );
        }

        // Add meeting_id column
        if (!(await columnExists('course_sessions', 'meeting_id'))) {
            await queryRunner.addColumn(
                'course_sessions',
                new TableColumn({
                    name: 'meeting_id',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                }),
            );
        }

        // Add qr_code_url column
        if (!(await columnExists('course_sessions', 'qr_code_url'))) {
            await queryRunner.addColumn(
                'course_sessions',
                new TableColumn({
                    name: 'qr_code_url',
                    type: 'varchar',
                    length: '500',
                    isNullable: true,
                }),
            );
        }

        // Add qr_code_data column
        if (!(await columnExists('course_sessions', 'qr_code_data'))) {
            await queryRunner.addColumn(
                'course_sessions',
                new TableColumn({
                    name: 'qr_code_data',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }

        // Update status default and comment for sessions
        await queryRunner.query(`
            ALTER TABLE \`course_sessions\` 
            MODIFY COLUMN \`status\` varchar(50) DEFAULT 'scheduled' 
            COMMENT 'scheduled, ongoing, completed, cancelled'
        `);

        // Update existing 'in_progress' status to 'ongoing'
        await queryRunner.query(`
            UPDATE \`course_sessions\` 
            SET \`status\` = 'ongoing' 
            WHERE \`status\` = 'in_progress'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert status updates
        await queryRunner.query(`
            UPDATE \`course_sessions\` 
            SET \`status\` = 'in_progress' 
            WHERE \`status\` = 'ongoing'
        `);

        await queryRunner.query(`
            ALTER TABLE \`course_sessions\` 
            MODIFY COLUMN \`status\` varchar(50) DEFAULT 'scheduled' 
            COMMENT 'scheduled, in_progress, completed, cancelled'
        `);

        await queryRunner.query(`
            UPDATE \`courses\` 
            SET \`status\` = 'upcoming' 
            WHERE \`status\` = 'draft'
        `);

        await queryRunner.query(`
            ALTER TABLE \`courses\` 
            MODIFY COLUMN \`status\` varchar(50) DEFAULT 'upcoming' 
            COMMENT 'upcoming, ongoing, completed, cancelled'
        `);

        // Remove columns from course_sessions
        await queryRunner.dropColumn('course_sessions', 'qr_code_data');
        await queryRunner.dropColumn('course_sessions', 'qr_code_url');
        await queryRunner.dropColumn('course_sessions', 'meeting_id');
        await queryRunner.dropColumn('course_sessions', 'meeting_link');

        // Remove indexes
        await queryRunner.dropIndex('courses', 'idx_courses_is_published');
        await queryRunner.dropIndex('courses', 'idx_courses_category');

        // Remove is_published column
        await queryRunner.dropColumn('courses', 'is_published');

        // Re-add constraint (if needed)
        await queryRunner.query(`
            ALTER TABLE \`courses\` 
            ADD CONSTRAINT \`valid_sessions\` CHECK (total_sessions > 0)
        `);
    }
}

