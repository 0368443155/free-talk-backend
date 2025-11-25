import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSchedulesTable1764065000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create schedules table
        await queryRunner.createTable(
            new Table({
                name: 'schedules',
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
                        name: 'start_time',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'end_time',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'price',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'max_students',
                        type: 'integer',
                        default: 10,
                    },
                    {
                        name: 'current_students',
                        type: 'integer',
                        default: 0,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'open'",
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

        // Add foreign key
        await queryRunner.createForeignKey(
            'schedules',
            new TableForeignKey({
                columnNames: ['teacher_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
            }),
        );

        // Add indexes
        await queryRunner.createIndex(
            'schedules',
            new TableIndex({
                name: 'idx_schedules_teacher',
                columnNames: ['teacher_id'],
            }),
        );

        await queryRunner.createIndex(
            'schedules',
            new TableIndex({
                name: 'idx_schedules_status',
                columnNames: ['status'],
            }),
        );

        await queryRunner.createIndex(
            'schedules',
            new TableIndex({
                name: 'idx_schedules_time',
                columnNames: ['start_time', 'end_time'],
            }),
        );

        // Add check constraints
        await queryRunner.query(`
      ALTER TABLE schedules 
      ADD CONSTRAINT valid_time_range CHECK (end_time > start_time)
    `);

        await queryRunner.query(`
      ALTER TABLE schedules 
      ADD CONSTRAINT valid_price CHECK (price >= 0)
    `);

        await queryRunner.query(`
      ALTER TABLE schedules 
      ADD CONSTRAINT valid_students CHECK (current_students <= max_students)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('schedules');
    }
}
