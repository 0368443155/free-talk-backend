import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsHiddenToReviews1733100000000 implements MigrationInterface {
  name = 'AddIsHiddenToReviews1733100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('reviews');
    if (!tableExists) {
      console.log('Table reviews does not exist, skipping...');
      return;
    }

    const columnExists = await queryRunner.hasColumn('reviews', 'is_hidden');
    if (columnExists) {
      console.log('Column is_hidden already exists, skipping...');
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`reviews\`
      ADD COLUMN \`is_hidden\` boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_reviews_is_hidden\` ON \`reviews\` (\`is_hidden\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('reviews');
    if (!tableExists) {
      return;
    }

    const columnExists = await queryRunner.hasColumn('reviews', 'is_hidden');
    if (columnExists) {
      await queryRunner.query(`DROP INDEX \`IDX_reviews_is_hidden\` ON \`reviews\``);
      await queryRunner.query(`ALTER TABLE \`reviews\` DROP COLUMN \`is_hidden\``);
    }
  }
}

