import { MigrationInterface, QueryRunner } from 'typeorm';

export class MapMeetingTypesToRoomTypes1766000000000 implements MigrationInterface {
  name = 'MapMeetingTypesToRoomTypes1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('meetings');
    const hasRoomType = table?.findColumnByName('room_type');

    if (!hasRoomType) {
      // Add new column for room_type
      await queryRunner.query(`
        ALTER TABLE \`meetings\` 
        ADD COLUMN \`room_type\` VARCHAR(50) NULL
      `);
    }

    // Map existing meeting types to room types
    await queryRunner.query(`
      UPDATE \`meetings\` 
      SET \`room_type\` = CASE
        WHEN \`meeting_type\` = 'free_talk' THEN 'FREE_TALK'
        WHEN \`meeting_type\` = 'teacher_class' THEN 'TEACHER_CLASS'
        WHEN \`meeting_type\` = 'workshop' THEN 'WEBINAR'
        WHEN \`meeting_type\` = 'private_session' THEN 'INTERVIEW'
        ELSE 'FREE_TALK'
      END
      WHERE \`room_type\` IS NULL
    `);

    // Make room_type NOT NULL after populating (if not already)
    const roomTypeColumn = table?.findColumnByName('room_type');
    if (roomTypeColumn?.isNullable) {
      await queryRunner.query(`
        ALTER TABLE \`meetings\` 
        MODIFY COLUMN \`room_type\` VARCHAR(50) NOT NULL DEFAULT 'FREE_TALK'
      `);
    }

    // Add index if not exists
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = 'meetings'
      AND index_name = 'IDX_meetings_room_type'
    `);

    if (indexExists[0].count === 0) {
      await queryRunner.query(`
        CREATE INDEX \`IDX_meetings_room_type\` ON \`meetings\` (\`room_type\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      AND table_name = 'meetings'
      AND index_name = 'IDX_meetings_room_type'
    `);

    if (indexExists[0].count > 0) {
      await queryRunner.query(`DROP INDEX \`IDX_meetings_room_type\` ON \`meetings\``);
    }

    // Drop column
    const table = await queryRunner.getTable('meetings');
    const hasRoomType = table?.findColumnByName('room_type');
    if (hasRoomType) {
      await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`room_type\``);
    }
  }
}

