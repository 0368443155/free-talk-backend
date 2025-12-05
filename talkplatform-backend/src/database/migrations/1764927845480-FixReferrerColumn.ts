import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class FixReferrerColumn1764927845480 implements MigrationInterface {
    name = 'FixReferrerColumn1764927845480';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('users');
        
        // Step 1: Check if old column exists
        const oldColumn = table?.findColumnByName('refferrer_id');
        const newColumn = table?.findColumnByName('referrer_id');
        
        // Step 2: Handle column rename/creation
        // Note: MySQL uses char(36) for UUID, not uuid type
        if (oldColumn && !newColumn) {
            // Case 1: Old column exists, new doesn't - Just rename (type is already char(36))
            await queryRunner.renameColumn('users', 'refferrer_id', 'referrer_id');
        } else if (!oldColumn && !newColumn) {
            // Case 2: Neither exists - Create new
            await queryRunner.addColumn('users', new TableColumn({
                name: 'referrer_id',
                type: 'char',
                length: '36',
                isNullable: true,
            }));
        }
        // Case 3: If newColumn already exists, do nothing (already correct)

        // Step 3: Drop old index if exists
        const oldIndex = table?.indices.find(idx => idx.columnNames.includes('refferrer_id'));
        if (oldIndex && oldIndex.name) {
            try {
                await queryRunner.dropIndex('users', oldIndex.name);
            } catch (error: any) {
                // Ignore if index doesn't exist
                if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.warn('Warning dropping old index:', error.message);
                }
            }
        }

        // Step 4: Create new index if not exists
        try {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS IDX_USERS_REFERRER_ID 
                ON users(referrer_id)
            `);
        } catch (error: any) {
            // Check if index already exists
            if (error.code !== 'ER_DUP_KEYNAME' && error.errno !== 1061) {
                console.warn('Warning creating index:', error.message);
            }
        }

        // Step 5: Create foreign key if not exists
        try {
            // Check if foreign key already exists
            const fkCheck = await queryRunner.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE table_schema = DATABASE() 
                AND table_name = 'users' 
                AND constraint_name = 'FK_USERS_REFERRER'
            `);
            
            if (fkCheck[0].count === 0) {
                await queryRunner.createForeignKey('users', new TableForeignKey({
                    name: 'FK_USERS_REFERRER',
                    columnNames: ['referrer_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'users',
                    onDelete: 'SET NULL', // Nếu người giới thiệu bị xóa, set null
                }));
            }
        } catch (error: any) {
            console.warn('Warning creating foreign key:', error.message);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        const table = await queryRunner.getTable('users');
        const fk = table?.foreignKeys.find(fk => fk.name === 'FK_USERS_REFERRER');
        if (fk) {
            try {
                await queryRunner.dropForeignKey('users', fk);
            } catch (error: any) {
                console.warn('Warning dropping foreign key:', error.message);
            }
        }

        // Drop index
        try {
            await queryRunner.query(`
                DROP INDEX IF EXISTS IDX_USERS_REFERRER_ID ON users
            `);
        } catch (error: any) {
            console.warn('Warning dropping index:', error.message);
        }

        // Rename back (optional - might want to keep new name)
        const newColumn = table?.findColumnByName('referrer_id');
        if (newColumn) {
            try {
                await queryRunner.renameColumn('users', 'referrer_id', 'refferrer_id');
                await queryRunner.changeColumn('users', 'refferrer_id', new TableColumn({
                    name: 'refferrer_id',
                    type: 'char',
                    length: '36',
                    isNullable: true,
                }));
            } catch (error: any) {
                console.warn('Warning renaming column back:', error.message);
            }
        }
    }
}

