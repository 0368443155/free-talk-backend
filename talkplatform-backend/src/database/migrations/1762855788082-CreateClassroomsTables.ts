import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateClassroomsTables1762855788082 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create classrooms table
        await queryRunner.createTable(
            new Table({
                name: 'classrooms',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'teacher_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'cover_image',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'settings',
                        type: 'json',
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
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Add foreign key for teacher_id
        await queryRunner.createForeignKey(
            'classrooms',
            new TableForeignKey({
                columnNames: ['teacher_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // Create classroom_members table
        await queryRunner.createTable(
            new Table({
                name: 'classroom_members',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                    },
                    {
                        name: 'classroom_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'user_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'role',
                        type: 'enum',
                        enum: ['student', 'assistant'],
                        default: "'student'",
                    },
                    {
                        name: 'joined_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Add foreign keys for classroom_members
        await queryRunner.createForeignKey(
            'classroom_members',
            new TableForeignKey({
                columnNames: ['classroom_id'],
                referencedTableName: 'classrooms',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'classroom_members',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        // Now add foreign key to meetings.classroom_id (if column exists)
        const meetingsTable = await queryRunner.getTable('meetings');
        const hasClassroomId = meetingsTable?.columns.find(col => col.name === 'classroom_id');
        
        if (hasClassroomId) {
            await queryRunner.createForeignKey(
                'meetings',
                new TableForeignKey({
                    columnNames: ['classroom_id'],
                    referencedTableName: 'classrooms',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key from meetings if exists
        const meetingsTable = await queryRunner.getTable('meetings');
        const foreignKey = meetingsTable?.foreignKeys.find(
            fk => fk.columnNames.indexOf('classroom_id') !== -1
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey('meetings', foreignKey);
        }

        // Drop classroom_members table (will cascade drop foreign keys)
        await queryRunner.dropTable('classroom_members', true);

        // Drop classrooms table (will cascade drop foreign keys)
        await queryRunner.dropTable('classrooms', true);
    }

}
