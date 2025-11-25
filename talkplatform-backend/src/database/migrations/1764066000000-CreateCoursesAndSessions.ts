import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCoursesAndSessions1764066000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create courses table
        await queryRunner.createTable(
            new Table({
                name: 'courses',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'teacher_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'duration_hours',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'total_sessions',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'price_type',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        comment: 'per_session or full_course',
                    },
                    {
                        name: 'price_per_session',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'price_full_course',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'language',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'level',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'upcoming'",
                        comment: 'upcoming, ongoing, completed, cancelled',
                    },
                    {
                        name: 'max_students',
                        type: 'integer',
                        default: 20,
                    },
                    {
                        name: 'current_students',
                        type: 'integer',
                        default: 0,
                    },
                    {
                        name: 'affiliate_code',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                        isUnique: true,
                    },
                    {
                        name: 'qr_code_url',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'share_link',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create course_sessions table
        await queryRunner.createTable(
            new Table({
                name: 'course_sessions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'course_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'session_number',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'scheduled_date',
                        type: 'date',
                        isNullable: false,
                    },
                    {
                        name: 'start_time',
                        type: 'time',
                        isNullable: false,
                    },
                    {
                        name: 'end_time',
                        type: 'time',
                        isNullable: false,
                    },
                    {
                        name: 'duration_minutes',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'scheduled'",
                        comment: 'scheduled, in_progress, completed, cancelled',
                    },
                    {
                        name: 'livekit_room_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'actual_start_time',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'actual_end_time',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'actual_duration_minutes',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Add foreign keys
        await queryRunner.createForeignKey(
            'courses',
            new TableForeignKey({
                columnNames: ['teacher_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'course_sessions',
            new TableForeignKey({
                columnNames: ['course_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'courses',
                onDelete: 'CASCADE',
            }),
        );

        // Add indexes
        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'idx_courses_teacher',
                columnNames: ['teacher_id'],
            }),
        );

        await queryRunner.createIndex(
            'courses',
            new TableIndex({
                name: 'idx_courses_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'course_sessions',
            new TableIndex({
                name: 'idx_sessions_course',
                columnNames: ['course_id'],
            }),
        );

        await queryRunner.createIndex(
            'course_sessions',
            new TableIndex({
                name: 'idx_sessions_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'course_sessions',
            new TableIndex({
                name: 'idx_sessions_date',
                columnNames: ['scheduled_date'],
            }),
        );

        // Add unique constraint for course_id + session_number
        await queryRunner.createIndex(
            'course_sessions',
            new TableIndex({
                name: 'idx_sessions_unique',
                columnNames: ['course_id', 'session_number'],
                isUnique: true,
            }),
        );

        // Add check constraints
        await queryRunner.query(`
      ALTER TABLE courses 
      ADD CONSTRAINT valid_price CHECK (
        (price_type = 'per_session' AND price_per_session >= 1.00) OR
        (price_type = 'full_course' AND price_full_course >= 1.00)
      )
    `);

        await queryRunner.query(`
      ALTER TABLE courses 
      ADD CONSTRAINT valid_students CHECK (current_students <= max_students)
    `);

        await queryRunner.query(`
      ALTER TABLE courses 
      ADD CONSTRAINT valid_sessions CHECK (total_sessions > 0)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('course_sessions');
        await queryRunner.dropTable('courses');
    }
}
