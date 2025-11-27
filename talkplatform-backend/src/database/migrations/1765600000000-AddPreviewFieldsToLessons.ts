import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPreviewFieldsToLessons1765600000000 implements MigrationInterface {
  name = 'AddPreviewFieldsToLessons1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist
    const hasIsPreview = await queryRunner.hasColumn('lessons', 'is_preview');
    const hasIsFree = await queryRunner.hasColumn('lessons', 'is_free');

    if (!hasIsPreview) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'is_preview',
          type: 'boolean',
          default: false,
        })
      );

      await queryRunner.createIndex(
        'lessons',
        new TableIndex({
          name: 'IDX_lessons_is_preview',
          columnNames: ['is_preview'],
        })
      );
    }

    if (!hasIsFree) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'is_free',
          type: 'boolean',
          default: false,
        })
      );

      await queryRunner.createIndex(
        'lessons',
        new TableIndex({
          name: 'IDX_lessons_is_free',
          columnNames: ['is_free'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasIsPreview = await queryRunner.hasColumn('lessons', 'is_preview');
    const hasIsFree = await queryRunner.hasColumn('lessons', 'is_free');

    if (hasIsPreview) {
      await queryRunner.dropIndex('lessons', 'IDX_lessons_is_preview');
      await queryRunner.dropColumn('lessons', 'is_preview');
    }

    if (hasIsFree) {
      await queryRunner.dropIndex('lessons', 'IDX_lessons_is_free');
      await queryRunner.dropColumn('lessons', 'is_free');
    }
  }
}

