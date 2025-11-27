import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableColumn } from 'typeorm';

export class CourseLessonMeetingRestructure1765200000000 implements MigrationInterface {
    name = 'CourseLessonMeetingRestructure1765200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create lessons table
        const lessonsTableExists = await queryRunner.hasTable('lessons');
        if (!lessonsTableExists) {
            await queryRunner.createTable(
                new Table({
                    name: 'lessons',
                    columns: [
                        {
                            name: 'id',
                            type: 'varchar',
                            length: '36',
                            isPrimary: true,
                            generationStrategy: 'uuid',
                            default: '(UUID())',
                        },
                        {
                            name: 'session_id',
                            type: 'varchar',
                            length: '36',
                            isNullable: false,
                        },
                        {
                            name: 'lesson_number',
                            type: 'int',
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
                            name: 'scheduled_date',
                            type: 'date',
                            isNullable: false,
                        },
                        {
                            name: 'start_time',
                            type: 'varchar',
                            length: '10',
                            isNullable: false,
                        },
                        {
                            name: 'end_time',
                            type: 'varchar',
                            length: '10',
                            isNullable: false,
                        },
                        {
                            name: 'duration_minutes',
                            type: 'int',
                            isNullable: false,
                        },
                        {
                            name: 'meeting_id',
                            type: 'varchar',
                            length: '36',
                            isNullable: true,
                        },
                        {
                            name: 'livekit_room_name',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'meeting_link',
                            type: 'varchar',
                            length: '500',
                            isNullable: true,
                        },
                        {
                            name: 'qr_code_url',
                            type: 'varchar',
                            length: '500',
                            isNullable: true,
                        },
                        {
                            name: 'qr_code_data',
                            type: 'text',
                            isNullable: true,
                        },
                        {
                            name: 'status',
                            type: 'varchar',
                            length: '50',
                            default: "'scheduled'",
                            isNullable: false,
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
                            onUpdate: 'CURRENT_TIMESTAMP',
                        },
                    ],
                }),
                true,
            );

            // Add foreign keys and indexes for lessons
            await queryRunner.createForeignKey(
                'lessons',
                new TableForeignKey({
                    columnNames: ['session_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'course_sessions',
                    onDelete: 'CASCADE',
                }),
            );

            await queryRunner.createForeignKey(
                'lessons',
                new TableForeignKey({
                    columnNames: ['meeting_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'meetings',
                    onDelete: 'SET NULL',
                }),
            );

            await queryRunner.createIndex(
                'lessons',
                new TableIndex({
                    name: 'idx_lessons_session_id',
                    columnNames: ['session_id'],
                }),
            );

            await queryRunner.createIndex(
                'lessons',
                new TableIndex({
                    name: 'idx_lessons_meeting_id',
                    columnNames: ['meeting_id'],
                }),
            );

            await queryRunner.createIndex(
                'lessons',
                new TableIndex({
                    name: 'idx_lessons_scheduled_date',
                    columnNames: ['scheduled_date'],
                }),
            );

            await queryRunner.createIndex(
                'lessons',
                new TableIndex({
                    name: 'idx_lessons_status',
                    columnNames: ['status'],
                }),
            );

            await queryRunner.createIndex(
                'lessons',
                new TableIndex({
                    name: 'idx_lessons_session_lesson_unique',
                    columnNames: ['session_id', 'lesson_number'],
                    isUnique: true,
                }),
            );
        }

        // 2. Create lesson_materials table
        const lessonMaterialsTableExists = await queryRunner.hasTable('lesson_materials');
        if (!lessonMaterialsTableExists) {
            await queryRunner.createTable(
                new Table({
                    name: 'lesson_materials',
                    columns: [
                        {
                            name: 'id',
                            type: 'varchar',
                            length: '36',
                            isPrimary: true,
                            generationStrategy: 'uuid',
                            default: '(UUID())',
                        },
                        {
                            name: 'lesson_id',
                            type: 'varchar',
                            length: '36',
                            isNullable: false,
                        },
                        {
                            name: 'type',
                            type: 'enum',
                            enum: ['document', 'video', 'link'],
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
                            name: 'file_url',
                            type: 'varchar',
                            length: '500',
                            isNullable: true,
                        },
                        {
                            name: 'file_name',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'file_size',
                            type: 'int',
                            isNullable: true,
                        },
                        {
                            name: 'file_type',
                            type: 'varchar',
                            length: '100',
                            isNullable: true,
                        },
                        {
                            name: 'display_order',
                            type: 'int',
                            default: 0,
                        },
                        {
                            name: 'is_required',
                            type: 'boolean',
                            default: false,
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
                            onUpdate: 'CURRENT_TIMESTAMP',
                        },
                    ],
                }),
                true,
            );

            await queryRunner.createForeignKey(
                'lesson_materials',
                new TableForeignKey({
                    columnNames: ['lesson_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'lessons',
                    onDelete: 'CASCADE',
                }),
            );

            await queryRunner.createIndex(
                'lesson_materials',
                new TableIndex({
                    name: 'idx_lesson_materials_lesson_id',
                    columnNames: ['lesson_id'],
                }),
            );

            await queryRunner.createIndex(
                'lesson_materials',
                new TableIndex({
                    name: 'idx_lesson_materials_type',
                    columnNames: ['type'],
                }),
            );
        }

        // 3. Update course_sessions table
        // Add new columns first
        const courseSessionsTable = await queryRunner.getTable('course_sessions');
        
        if (courseSessionsTable) {
            // Add total_lessons if not exists
            const totalLessonsColumn = courseSessionsTable.findColumnByName('total_lessons');
            if (!totalLessonsColumn) {
                await queryRunner.addColumn(
                    'course_sessions',
                    new TableColumn({
                        name: 'total_lessons',
                        type: 'int',
                        default: 0,
                    }),
                );
            }

            // Update status enum to include DRAFT, PUBLISHED, COMPLETED, ARCHIVED
            // Note: MySQL doesn't support ALTER ENUM easily, so we'll handle this in application code
            // For now, we'll just ensure the column exists and can accept new values

            // Remove old meeting-related columns (if they exist)
            const columnsToRemove = [
                'scheduled_date',
                'start_time',
                'end_time',
                'duration_minutes',
                'livekit_room_name',
                'meeting_link',
                'meeting_id',
                'qr_code_url',
                'qr_code_data',
                'actual_start_time',
                'actual_end_time',
                'actual_duration_minutes',
            ];

            for (const columnName of columnsToRemove) {
                const column = courseSessionsTable.findColumnByName(columnName);
                if (column) {
                    await queryRunner.dropColumn('course_sessions', columnName);
                }
            }

            // Remove old index on scheduled_date if exists
            const scheduledDateIndex = courseSessionsTable.indices.find(
                idx => idx.columnNames.includes('scheduled_date')
            );
            if (scheduledDateIndex) {
                await queryRunner.dropIndex('course_sessions', scheduledDateIndex);
            }
        }

        // 4. Update meetings table
        const meetingsTable = await queryRunner.getTable('meetings');
        if (meetingsTable) {
            // Add lesson_id, course_id, session_id, teacher_name, subject_name
            const columnsToAdd = [
                {
                    name: 'lesson_id',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'course_id',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'session_id',
                    type: 'varchar',
                    length: '36',
                    isNullable: true,
                },
                {
                    name: 'teacher_name',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
                {
                    name: 'subject_name',
                    type: 'varchar',
                    length: '255',
                    isNullable: true,
                },
            ];

            for (const columnDef of columnsToAdd) {
                const column = meetingsTable.findColumnByName(columnDef.name);
                if (!column) {
                    await queryRunner.addColumn('meetings', new TableColumn(columnDef));
                }
            }

            // Add foreign keys
            const lessonIdColumn = meetingsTable.findColumnByName('lesson_id');
            if (lessonIdColumn) {
                // Check if FK already exists
                const foreignKeys = await queryRunner.getTable('meetings');
                const lessonFkExists = foreignKeys?.foreignKeys.find(
                    fk => fk.columnNames.includes('lesson_id')
                );
                if (!lessonFkExists) {
                    await queryRunner.createForeignKey(
                        'meetings',
                        new TableForeignKey({
                            columnNames: ['lesson_id'],
                            referencedColumnNames: ['id'],
                            referencedTableName: 'lessons',
                            onDelete: 'SET NULL',
                        }),
                    );
                }
            }

            const courseIdColumn = meetingsTable.findColumnByName('course_id');
            if (courseIdColumn) {
                const foreignKeys = await queryRunner.getTable('meetings');
                const courseFkExists = foreignKeys?.foreignKeys.find(
                    fk => fk.columnNames.includes('course_id')
                );
                if (!courseFkExists) {
                    await queryRunner.createForeignKey(
                        'meetings',
                        new TableForeignKey({
                            columnNames: ['course_id'],
                            referencedColumnNames: ['id'],
                            referencedTableName: 'courses',
                            onDelete: 'SET NULL',
                        }),
                    );
                }
            }

            const sessionIdColumn = meetingsTable.findColumnByName('session_id');
            if (sessionIdColumn) {
                const foreignKeys = await queryRunner.getTable('meetings');
                const sessionFkExists = foreignKeys?.foreignKeys.find(
                    fk => fk.columnNames.includes('session_id')
                );
                if (!sessionFkExists) {
                    await queryRunner.createForeignKey(
                        'meetings',
                        new TableForeignKey({
                            columnNames: ['session_id'],
                            referencedColumnNames: ['id'],
                            referencedTableName: 'course_sessions',
                            onDelete: 'SET NULL',
                        }),
                    );
                }
            }

            // Add indexes
            await queryRunner.createIndex(
                'meetings',
                new TableIndex({
                    name: 'idx_meetings_lesson_id',
                    columnNames: ['lesson_id'],
                }),
            );

            await queryRunner.createIndex(
                'meetings',
                new TableIndex({
                    name: 'idx_meetings_course_id',
                    columnNames: ['course_id'],
                }),
            );

            await queryRunner.createIndex(
                'meetings',
                new TableIndex({
                    name: 'idx_meetings_session_id',
                    columnNames: ['session_id'],
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.dropIndex('meetings', 'idx_meetings_session_id');
        await queryRunner.dropIndex('meetings', 'idx_meetings_course_id');
        await queryRunner.dropIndex('meetings', 'idx_meetings_lesson_id');

        // Drop foreign keys
        const meetingsTable = await queryRunner.getTable('meetings');
        if (meetingsTable) {
            const foreignKeys = meetingsTable.foreignKeys.filter(
                fk => ['lesson_id', 'course_id', 'session_id'].some(col => fk.columnNames.includes(col))
            );
            for (const fk of foreignKeys) {
                await queryRunner.dropForeignKey('meetings', fk);
            }
        }

        // Drop columns from meetings
        await queryRunner.dropColumn('meetings', 'subject_name');
        await queryRunner.dropColumn('meetings', 'teacher_name');
        await queryRunner.dropColumn('meetings', 'session_id');
        await queryRunner.dropColumn('meetings', 'course_id');
        await queryRunner.dropColumn('meetings', 'lesson_id');

        // Restore course_sessions columns (simplified - you may need to adjust)
        await queryRunner.addColumn('course_sessions', new TableColumn({
            name: 'scheduled_date',
            type: 'date',
            isNullable: true,
        }));
        await queryRunner.addColumn('course_sessions', new TableColumn({
            name: 'start_time',
            type: 'time',
            isNullable: true,
        }));
        await queryRunner.addColumn('course_sessions', new TableColumn({
            name: 'end_time',
            type: 'time',
            isNullable: true,
        }));
        await queryRunner.addColumn('course_sessions', new TableColumn({
            name: 'duration_minutes',
            type: 'int',
            isNullable: true,
        }));

        await queryRunner.dropColumn('course_sessions', 'total_lessons');

        // Drop lesson_materials table
        await queryRunner.dropTable('lesson_materials');

        // Drop lessons table
        await queryRunner.dropTable('lessons');
    }
}

