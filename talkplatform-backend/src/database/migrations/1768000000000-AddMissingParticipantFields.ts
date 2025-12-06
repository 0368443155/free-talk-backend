import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingParticipantFields1768000000000 implements MigrationInterface {
    name = 'AddMissingParticipantFields1768000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns already exist before adding
        const table = await queryRunner.getTable('meeting_participants');
        
        if (table) {
            // Add duration_seconds if not exists
            const durationColumn = table.findColumnByName('duration_seconds');
            if (!durationColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    ADD COLUMN \`duration_seconds\` INT DEFAULT 0 NOT NULL
                `);
                // Add index for duration_seconds
                await queryRunner.query(`
                    CREATE INDEX \`idx_meeting_participants_duration\`
                    ON \`meeting_participants\`(\`duration_seconds\`)
                `);
            }

            // Add device_type if not exists
            const deviceTypeColumn = table.findColumnByName('device_type');
            if (!deviceTypeColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    ADD COLUMN \`device_type\` VARCHAR(100) NULL
                `);
            }

            // Add connection_quality if not exists
            const connectionQualityColumn = table.findColumnByName('connection_quality');
            if (!connectionQualityColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    ADD COLUMN \`connection_quality\` VARCHAR(50) NULL
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('meeting_participants');
        
        if (table) {
            // Drop index if exists
            const durationIndex = table.indices.find(idx => idx.name === 'idx_meeting_participants_duration');
            if (durationIndex) {
                await queryRunner.query(`
                    DROP INDEX \`idx_meeting_participants_duration\`
                    ON \`meeting_participants\`
                `);
            }

            // Drop columns if exist
            const durationColumn = table.findColumnByName('duration_seconds');
            if (durationColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    DROP COLUMN \`duration_seconds\`
                `);
            }

            const deviceTypeColumn = table.findColumnByName('device_type');
            if (deviceTypeColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    DROP COLUMN \`device_type\`
                `);
            }

            const connectionQualityColumn = table.findColumnByName('connection_quality');
            if (connectionQualityColumn) {
                await queryRunner.query(`
                    ALTER TABLE \`meeting_participants\`
                    DROP COLUMN \`connection_quality\`
                `);
            }
        }
    }
}

