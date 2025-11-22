import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWebhookEventsTable1763600000000 implements MigrationInterface {
    name = 'CreateWebhookEventsTable1763600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'webhook_events',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'event',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'roomName',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'participantIdentity',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'eventData',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'isTestEvent',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'processed',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'errorMessage',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes
        await queryRunner.createIndex(
            'webhook_events',
            new TableIndex({
                name: 'IDX_webhook_events_event_createdAt',
                columnNames: ['event', 'createdAt'],
            }),
        );

        await queryRunner.createIndex(
            'webhook_events',
            new TableIndex({
                name: 'IDX_webhook_events_roomName_createdAt',
                columnNames: ['roomName', 'createdAt'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('webhook_events');
    }
}

