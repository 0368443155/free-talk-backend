import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class SeparateMeetingJsonFields1765500000000 implements MigrationInterface {
    name = 'SeparateMeetingJsonFields1765500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if tables already exist
        const meetingSettingsTableExists = await queryRunner.hasTable('meeting_settings');
        const meetingTagsTableExists = await queryRunner.hasTable('meeting_tags');

        // 1. Create meeting_settings table
        if (!meetingSettingsTableExists) {
            await queryRunner.createTable(
            new Table({
                name: 'meeting_settings',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                    },
                    {
                        name: 'meeting_id',
                        type: 'varchar',
                        length: '36',
                        isUnique: true,
                    },
                    {
                        name: 'allow_screen_share',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'allow_chat',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'allow_reactions',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'record_meeting',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'waiting_room',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'auto_record',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'mute_on_join',
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
            true
        );

            // Add foreign key for meeting_settings
            const fkExists = await queryRunner.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'meeting_settings' 
                AND CONSTRAINT_NAME = 'FK_meeting_settings_meeting_id'
            `);

            if (fkExists.length === 0) {
                await queryRunner.createForeignKey(
                    'meeting_settings',
                    new TableForeignKey({
                        columnNames: ['meeting_id'],
                        referencedTableName: 'meetings',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        name: 'FK_meeting_settings_meeting_id',
                    })
                );
            }
        }

        // 2. Create meeting_tags table
        if (!meetingTagsTableExists) {
            await queryRunner.createTable(
            new Table({
                name: 'meeting_tags',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                    },
                    {
                        name: 'meeting_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'tag',
                        type: 'varchar',
                        length: '100',
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

            // Add indexes for meeting_tags
            const idxMeetingIdExists = await queryRunner.query(`
                SELECT INDEX_NAME 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'meeting_tags' 
                AND INDEX_NAME = 'IDX_meeting_tags_meeting_id'
            `);

            if (idxMeetingIdExists.length === 0) {
                await queryRunner.createIndex(
                    'meeting_tags',
                    new TableIndex({
                        name: 'IDX_meeting_tags_meeting_id',
                        columnNames: ['meeting_id'],
                    })
                );
            }

            const idxTagExists = await queryRunner.query(`
                SELECT INDEX_NAME 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'meeting_tags' 
                AND INDEX_NAME = 'IDX_meeting_tags_tag'
            `);

            if (idxTagExists.length === 0) {
                await queryRunner.createIndex(
                    'meeting_tags',
                    new TableIndex({
                        name: 'IDX_meeting_tags_tag',
                        columnNames: ['tag'],
                    })
                );
            }

            // Add foreign key for meeting_tags
            const fkTagsExists = await queryRunner.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'meeting_tags' 
                AND CONSTRAINT_NAME = 'FK_meeting_tags_meeting_id'
            `);

            if (fkTagsExists.length === 0) {
                await queryRunner.createForeignKey(
                    'meeting_tags',
                    new TableForeignKey({
                        columnNames: ['meeting_id'],
                        referencedTableName: 'meetings',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                        name: 'FK_meeting_tags_meeting_id',
                    })
                );
            }
        }

        // 3. Migrate settings data from JSON to meeting_settings table
        await queryRunner.query(`
            INSERT INTO meeting_settings (id, meeting_id, allow_screen_share, allow_chat, allow_reactions, record_meeting, waiting_room, auto_record, mute_on_join, created_at, updated_at)
            SELECT 
                REPLACE(UUID(), '-', '') as id,
                id as meeting_id,
                IF(JSON_EXTRACT(settings, '$.allow_screen_share') IS NULL, 1, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.allow_screen_share')) = 'true', 1, 0)) as allow_screen_share,
                IF(JSON_EXTRACT(settings, '$.allow_chat') IS NULL, 1, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.allow_chat')) = 'true', 1, 0)) as allow_chat,
                IF(JSON_EXTRACT(settings, '$.allow_reactions') IS NULL, 1, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.allow_reactions')) = 'true', 1, 0)) as allow_reactions,
                IF(JSON_EXTRACT(settings, '$.record_meeting') IS NULL, 0, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.record_meeting')) = 'true', 1, 0)) as record_meeting,
                IF(JSON_EXTRACT(settings, '$.waiting_room') IS NULL, 0, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.waiting_room')) = 'true', 1, 0)) as waiting_room,
                IF(JSON_EXTRACT(settings, '$.auto_record') IS NULL, 0, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.auto_record')) = 'true', 1, 0)) as auto_record,
                IF(JSON_EXTRACT(settings, '$.mute_on_join') IS NULL, 0, IF(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.mute_on_join')) = 'true', 1, 0)) as mute_on_join,
                created_at,
                updated_at
            FROM meetings
            WHERE settings IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM meeting_settings ms WHERE ms.meeting_id = meetings.id)
        `);

        // 4. Migrate tags data from JSON to meeting_tags table
        await queryRunner.query(`
            INSERT INTO meeting_tags (id, meeting_id, tag, created_at)
            SELECT 
                REPLACE(UUID(), '-', '') as id,
                m.id as meeting_id,
                JSON_UNQUOTE(JSON_EXTRACT(m.tags, CONCAT('$[', idx.idx, ']'))) as tag,
                m.created_at
            FROM meetings m
            CROSS JOIN (
                SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            ) idx
            WHERE m.tags IS NOT NULL
            AND JSON_EXTRACT(m.tags, CONCAT('$[', idx.idx, ']')) IS NOT NULL
        `);

        // 5. Migrate blocked_users JSON to blocked_participants table (if not already migrated)
        // Note: This assumes blocked_users is an array of user IDs
        await queryRunner.query(`
            INSERT INTO blocked_participants (id, meeting_id, user_id, blocked_by, created_at)
            SELECT 
                REPLACE(UUID(), '-', '') as id,
                m.id as meeting_id,
                JSON_UNQUOTE(JSON_EXTRACT(m.blocked_users, CONCAT('$[', idx.idx, ']'))) as user_id,
                m.host_id as blocked_by,
                m.created_at
            FROM meetings m
            CROSS JOIN (
                SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
            ) idx
            WHERE m.blocked_users IS NOT NULL
            AND JSON_EXTRACT(m.blocked_users, CONCAT('$[', idx.idx, ']')) IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM blocked_participants bp 
                WHERE bp.meeting_id = m.id 
                AND bp.user_id = JSON_UNQUOTE(JSON_EXTRACT(m.blocked_users, CONCAT('$[', idx.idx, ']')))
            )
        `);

        // 6. Drop JSON columns from meetings table
        await queryRunner.dropColumn('meetings', 'settings');
        await queryRunner.dropColumn('meetings', 'tags');
        await queryRunner.dropColumn('meetings', 'blocked_users');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back JSON columns
        await queryRunner.addColumn(
            'meetings',
            new TableColumn({
                name: 'settings',
                type: 'json',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'meetings',
            new TableColumn({
                name: 'tags',
                type: 'json',
                isNullable: true,
            })
        );

        await queryRunner.addColumn(
            'meetings',
            new TableColumn({
                name: 'blocked_users',
                type: 'json',
                isNullable: true,
            })
        );

        // Migrate data back from tables to JSON
        await queryRunner.query(`
            UPDATE meetings m
            LEFT JOIN meeting_settings ms ON m.id = ms.meeting_id
            SET m.settings = JSON_OBJECT(
                'allow_screen_share', COALESCE(ms.allow_screen_share, true),
                'allow_chat', COALESCE(ms.allow_chat, true),
                'allow_reactions', COALESCE(ms.allow_reactions, true),
                'record_meeting', COALESCE(ms.record_meeting, false),
                'waiting_room', COALESCE(ms.waiting_room, false),
                'auto_record', COALESCE(ms.auto_record, false),
                'mute_on_join', COALESCE(ms.mute_on_join, false)
            )
            WHERE ms.id IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE meetings m
            SET m.tags = (
                SELECT JSON_ARRAYAGG(mt.tag)
                FROM meeting_tags mt
                WHERE mt.meeting_id = m.id
            )
            WHERE EXISTS (SELECT 1 FROM meeting_tags mt WHERE mt.meeting_id = m.id)
        `);

        await queryRunner.query(`
            UPDATE meetings m
            SET m.blocked_users = (
                SELECT JSON_ARRAYAGG(bp.user_id)
                FROM blocked_participants bp
                WHERE bp.meeting_id = m.id
            )
            WHERE EXISTS (SELECT 1 FROM blocked_participants bp WHERE bp.meeting_id = m.id)
        `);

        // Drop tables
        await queryRunner.dropTable('meeting_tags');
        await queryRunner.dropTable('meeting_settings');
    }
}

