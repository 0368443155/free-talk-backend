import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateLiveKitEventDetailsTable1763800000000 implements MigrationInterface {
    name = 'CreateLiveKitEventDetailsTable1763800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const tableExists = await queryRunner.hasTable('livekit_event_details');
        
        if (!tableExists) {
            await queryRunner.createTable(
                new Table({
                    name: 'livekit_event_details',
                    columns: [
                        {
                            name: 'id',
                            type: 'int',
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
                        {
                            name: 'event_type',
                            type: 'varchar',
                            length: '50',
                        },
                        {
                            name: 'meeting_id',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'room_name',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'participant_identity',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'participant_user_id',
                            type: 'varchar',
                            length: '36',
                            isNullable: true,
                        },
                        {
                            name: 'participant_name',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'track_type',
                            type: 'enum',
                            enum: ['audio', 'video'],
                            isNullable: true,
                        },
                        {
                            name: 'track_source',
                            type: 'enum',
                            enum: ['camera', 'microphone', 'screen_share', 'screen_share_audio'],
                            isNullable: true,
                        },
                        {
                            name: 'track_sid',
                            type: 'varchar',
                            length: '255',
                            isNullable: true,
                        },
                        {
                            name: 'track_muted',
                            type: 'boolean',
                            isNullable: true,
                        },
                        {
                            name: 'room_num_participants',
                            type: 'int',
                            isNullable: true,
                        },
                        {
                            name: 'room_duration_seconds',
                            type: 'int',
                            isNullable: true,
                        },
                        {
                            name: 'event_data',
                            type: 'json',
                            isNullable: true,
                        },
                        {
                            name: 'webhook_event_id',
                            type: 'int',
                            isNullable: true,
                        },
                        {
                            name: 'created_at',
                            type: 'timestamp',
                            default: 'CURRENT_TIMESTAMP',
                        },
                    ],
                }),
                true,
            );

            // Create indexes
            await queryRunner.createIndex(
                'livekit_event_details',
                new TableIndex({
                    name: 'IDX_livekit_event_details_meeting_event_created',
                    columnNames: ['meeting_id', 'event_type', 'created_at'],
                }),
            );

            await queryRunner.createIndex(
                'livekit_event_details',
                new TableIndex({
                    name: 'IDX_livekit_event_details_participant_created',
                    columnNames: ['participant_identity', 'created_at'],
                }),
            );

            await queryRunner.createIndex(
                'livekit_event_details',
                new TableIndex({
                    name: 'IDX_livekit_event_details_event_created',
                    columnNames: ['event_type', 'created_at'],
                }),
            );

            // Create foreign keys
            await queryRunner.createForeignKey(
                'livekit_event_details',
                new TableForeignKey({
                    columnNames: ['meeting_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'meetings',
                    onDelete: 'SET NULL',
                }),
            );

            await queryRunner.createForeignKey(
                'livekit_event_details',
                new TableForeignKey({
                    columnNames: ['participant_user_id'],
                    referencedColumnNames: ['id'],
                    referencedTableName: 'users',
                    onDelete: 'SET NULL',
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('livekit_event_details');
        if (table) {
            const foreignKeys = table.foreignKeys;
            for (const fk of foreignKeys) {
                await queryRunner.dropForeignKey('livekit_event_details', fk);
            }
            await queryRunner.dropTable('livekit_event_details');
        }
    }
}

