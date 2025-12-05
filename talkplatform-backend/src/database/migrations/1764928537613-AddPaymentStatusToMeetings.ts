import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentStatusToMeetings1764928537613 implements MigrationInterface {
    name = 'AddPaymentStatusToMeetings1764928537613';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('meetings');
        
        // Step 1: Add payment_status enum column
        if (!table?.findColumnByName('payment_status')) {
            // For MySQL, use ENUM type
            try {
                await queryRunner.query(`
                    ALTER TABLE meetings 
                    ADD COLUMN payment_status ENUM('pending', 'processing', 'completed', 'failed', 'partial') 
                    DEFAULT 'pending'
                `);
            } catch (error: any) {
                console.warn('Warning adding payment_status:', error.message);
            }
        }

        // Step 2: Add payment_processed_at
        if (!table?.findColumnByName('payment_processed_at')) {
            try {
                await queryRunner.addColumn('meetings', new TableColumn({
                    name: 'payment_processed_at',
                    type: 'timestamp',
                    isNullable: true,
                }));
            } catch (error: any) {
                console.warn('Warning adding payment_processed_at:', error.message);
            }
        }

        // Step 3: Add payment_metadata (JSON)
        if (!table?.findColumnByName('payment_metadata')) {
            try {
                await queryRunner.addColumn('meetings', new TableColumn({
                    name: 'payment_metadata',
                    type: 'json',
                    isNullable: true,
                }));
            } catch (error: any) {
                console.warn('Warning adding payment_metadata:', error.message);
            }
        }

        // Step 4: Add index for querying pending payments
        try {
            // Check if index already exists
            const indexCheck = await queryRunner.query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE table_schema = DATABASE() 
                AND table_name = 'meetings' 
                AND index_name = 'IDX_MEETINGS_PAYMENT_STATUS'
            `);
            
            if (indexCheck[0].count === 0) {
                await queryRunner.query(`
                    CREATE INDEX IDX_MEETINGS_PAYMENT_STATUS 
                    ON meetings(payment_status, ended_at)
                `);
            }
        } catch (error: any) {
            // Ignore duplicate key error
            if (error.code !== 'ER_DUP_KEYNAME' && error.errno !== 1061) {
                console.warn('Warning creating index:', error.message);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        try {
            await queryRunner.query(`
                DROP INDEX IF EXISTS IDX_MEETINGS_PAYMENT_STATUS ON meetings
            `);
        } catch (error: any) {
            console.warn('Warning dropping index:', error.message);
        }

        // Drop columns
        const table = await queryRunner.getTable('meetings');
        
        if (table?.findColumnByName('payment_metadata')) {
            try {
                await queryRunner.dropColumn('meetings', 'payment_metadata');
            } catch (error: any) {
                console.warn('Warning dropping payment_metadata:', error.message);
            }
        }
        
        if (table?.findColumnByName('payment_processed_at')) {
            try {
                await queryRunner.dropColumn('meetings', 'payment_processed_at');
            } catch (error: any) {
                console.warn('Warning dropping payment_processed_at:', error.message);
            }
        }
        
        if (table?.findColumnByName('payment_status')) {
            try {
                await queryRunner.dropColumn('meetings', 'payment_status');
            } catch (error: any) {
                console.warn('Warning dropping payment_status:', error.message);
            }
        }
    }
}

