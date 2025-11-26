import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSessionMaterials1765100000000 implements MigrationInterface {
    name = 'CreateSessionMaterials1765100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table already exists
        const tableExists = await queryRunner.hasTable('session_materials');
        
        if (!tableExists) {
            await queryRunner.createTable(
                new Table({
                    name: 'session_materials',
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

            // Create indexes
            await queryRunner.createIndex(
                'session_materials',
                new TableIndex({
                    name: 'idx_session_id',
                    columnNames: ['session_id'],
                }),
            );

            await queryRunner.createIndex(
                'session_materials',
                new TableIndex({
                    name: 'idx_type',
                    columnNames: ['type'],
                }),
            );

            // Create foreign key
            await queryRunner.createForeignKey(
                'session_materials',
                new TableForeignKey({
                    columnNames: ['session_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'course_sessions',
                    onDelete: 'CASCADE',
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('session_materials');
        
        if (tableExists) {
            // Drop foreign key first
            const table = await queryRunner.getTable('session_materials');
            const foreignKey = table?.foreignKeys.find(
                (fk) => fk.columnNames.indexOf('session_id') !== -1,
            );
            if (foreignKey) {
                await queryRunner.dropForeignKey('session_materials', foreignKey);
            }

            // Drop indexes
            await queryRunner.dropIndex('session_materials', 'idx_session_id');
            await queryRunner.dropIndex('session_materials', 'idx_type');

            // Drop table
            await queryRunner.dropTable('session_materials');
        }
    }
}

