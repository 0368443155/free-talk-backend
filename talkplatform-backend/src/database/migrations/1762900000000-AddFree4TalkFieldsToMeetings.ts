import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFree4TalkFieldsToMeetings1762900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before adding them
    const table = await queryRunner.getTable('meetings');
    
    // Add language column only if it doesn't exist
    if (!table?.findColumnByName('language')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'language',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    // Add level column
    if (!table?.findColumnByName('level')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'level',
          type: 'enum',
          enum: ['beginner', 'intermediate', 'advanced'],
          isNullable: true,
        }),
      );
    }

    // Add topic column only if it doesn't exist
    if (!table?.findColumnByName('topic')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'topic',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }

    // Add room_status column
    if (!table?.findColumnByName('room_status')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'room_status',
          type: 'enum',
          enum: ['empty', 'available', 'crowded', 'full'],
          default: "'empty'",
        }),
      );
    }

    // Add allow_microphone column
    if (!table?.findColumnByName('allow_microphone')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'allow_microphone',
          type: 'boolean',
          default: true,
        }),
      );
    }

    // Add participants_can_unmute column
    if (!table?.findColumnByName('participants_can_unmute')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'participants_can_unmute',
          type: 'boolean',
          default: true,
        }),
      );
    }

    // Add blocked_users column
    if (!table?.findColumnByName('blocked_users')) {
      await queryRunner.addColumn(
        'meetings',
        new TableColumn({
          name: 'blocked_users',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('meetings');
    
    if (table?.findColumnByName('blocked_users')) {
      await queryRunner.dropColumn('meetings', 'blocked_users');
    }
    if (table?.findColumnByName('participants_can_unmute')) {
      await queryRunner.dropColumn('meetings', 'participants_can_unmute');
    }
    if (table?.findColumnByName('allow_microphone')) {
      await queryRunner.dropColumn('meetings', 'allow_microphone');
    }
    if (table?.findColumnByName('room_status')) {
      await queryRunner.dropColumn('meetings', 'room_status');
    }
    if (table?.findColumnByName('topic')) {
      await queryRunner.dropColumn('meetings', 'topic');
    }
    if (table?.findColumnByName('level')) {
      await queryRunner.dropColumn('meetings', 'level');
    }
    if (table?.findColumnByName('language')) {
      await queryRunner.dropColumn('meetings', 'language');
    }
  }
}
