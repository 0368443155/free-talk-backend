import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEnrollmentTables1764070000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Course Enrollments Table
        await queryRunner.createTable(
            new Table({
                name: 'course_enrollments',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'user_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'course_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'enrollment_type',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                        comment: 'full_course or per_session',
                    },
                    {
                        name: 'total_price_paid',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'payment_status',
                        type: 'varchar',
                        length: '50',
                        default: "'pending'",
                        comment: 'pending, paid, refunded',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'active'",
                        comment: 'active, cancelled, completed',
                    },
                    {
                        name: 'enrolled_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'cancelled_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'refund_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'completion_percentage',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
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
                indices: [
                    {
                        name: 'IDX_ENROLLMENT_USER',
                        columnNames: ['user_id'],
                    },
                    {
                        name: 'IDX_ENROLLMENT_COURSE',
                        columnNames: ['course_id'],
                    },
                    {
                        name: 'IDX_ENROLLMENT_STATUS',
                        columnNames: ['status'],
                    },
                ],
                uniques: [
                    {
                        name: 'UQ_USER_COURSE',
                        columnNames: ['user_id', 'course_id'],
                    },
                ],
            }),
            true,
        );

        // 2. Session Purchases Table
        await queryRunner.createTable(
            new Table({
                name: 'session_purchases',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'user_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'course_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'session_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'price_paid',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'payment_status',
                        type: 'varchar',
                        length: '50',
                        default: "'pending'",
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'active'",
                        comment: 'active, cancelled, attended, missed',
                    },
                    {
                        name: 'purchased_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'cancelled_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'refund_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'attended',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'attendance_duration_minutes',
                        type: 'int',
                        default: 0,
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
                indices: [
                    {
                        name: 'IDX_PURCHASE_USER',
                        columnNames: ['user_id'],
                    },
                    {
                        name: 'IDX_PURCHASE_SESSION',
                        columnNames: ['session_id'],
                    },
                    {
                        name: 'IDX_PURCHASE_STATUS',
                        columnNames: ['status'],
                    },
                ],
                uniques: [
                    {
                        name: 'UQ_USER_SESSION',
                        columnNames: ['user_id', 'session_id'],
                    },
                ],
            }),
            true,
        );

        // 3. Payment Holds Table
        await queryRunner.createTable(
            new Table({
                name: 'payment_holds',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'enrollment_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'session_purchase_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'teacher_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'student_id',
                        type: 'char',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'held'",
                        comment: 'held, released, refunded',
                    },
                    {
                        name: 'held_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'released_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'release_percentage',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_HOLD_TEACHER',
                        columnNames: ['teacher_id'],
                    },
                    {
                        name: 'IDX_HOLD_STUDENT',
                        columnNames: ['student_id'],
                    },
                    {
                        name: 'IDX_HOLD_STATUS',
                        columnNames: ['status'],
                    },
                ],
            }),
            true,
        );

        // Add Foreign Keys
        await queryRunner.createForeignKeys('course_enrollments', [
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['course_id'],
                referencedTableName: 'courses',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        ]);

        await queryRunner.createForeignKeys('session_purchases', [
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['course_id'],
                referencedTableName: 'courses',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['session_id'],
                referencedTableName: 'course_sessions',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        ]);

        await queryRunner.createForeignKeys('payment_holds', [
            new TableForeignKey({
                columnNames: ['enrollment_id'],
                referencedTableName: 'course_enrollments',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
            new TableForeignKey({
                columnNames: ['session_purchase_id'],
                referencedTableName: 'session_purchases',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
            new TableForeignKey({
                columnNames: ['teacher_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
            new TableForeignKey({
                columnNames: ['student_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('payment_holds');
        await queryRunner.dropTable('session_purchases');
        await queryRunner.dropTable('course_enrollments');
    }
}
