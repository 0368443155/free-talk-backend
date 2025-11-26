import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherProfileFields1764129000000 implements MigrationInterface {
  name = 'AddTeacherProfileFields1764129000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to check if column exists
    const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND column_name = ?
      `, [tableName, columnName]);
      return Number(result[0]?.count || 0) > 0;
    };

    const tableName = 'teacher_profiles';

    // Add total_reviews column
    if (!(await columnExists(tableName, 'total_reviews'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`total_reviews\` INT NOT NULL DEFAULT 0
      `);
    }

    // Add languages_taught column (JSON)
    if (!(await columnExists(tableName, 'languages_taught'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`languages_taught\` JSON NULL
      `);
    }

    // Add specialties column (JSON)
    if (!(await columnExists(tableName, 'specialties'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`specialties\` JSON NULL
      `);
    }

    // Add years_experience column
    if (!(await columnExists(tableName, 'years_experience'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`years_experience\` INT NOT NULL DEFAULT 0
      `);
    }

    // Add total_students column
    if (!(await columnExists(tableName, 'total_students'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`total_students\` INT NOT NULL DEFAULT 0
      `);
    }

    // Add avg_response_time_hours column
    if (!(await columnExists(tableName, 'avg_response_time_hours'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`avg_response_time_hours\` INT NOT NULL DEFAULT 24
      `);
    }

    // Add is_available column
    if (!(await columnExists(tableName, 'is_available'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`is_available\` TINYINT(1) NOT NULL DEFAULT 1
      `);
    }

    // Add country column (optional, can be stored in user table or here)
    if (!(await columnExists(tableName, 'country'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`country\` VARCHAR(100) NULL
      `);
    }

    // Add status column (enum)
    if (!(await columnExists(tableName, 'status'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`status\` ENUM('pending', 'approved', 'suspended', 'rejected') NOT NULL DEFAULT 'pending'
      `);
    }

    // Add hourly_rate_credits column (decimal, for more precise pricing)
    if (!(await columnExists(tableName, 'hourly_rate_credits'))) {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`hourly_rate_credits\` DECIMAL(10, 2) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'teacher_profiles';

    // Remove columns in reverse order
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`hourly_rate_credits\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`status\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`country\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`is_available\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`avg_response_time_hours\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`total_students\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`years_experience\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`specialties\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`languages_taught\``);
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP COLUMN IF EXISTS \`total_reviews\``);
  }
}

