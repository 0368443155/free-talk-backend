import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add student_notes and teacher_notes columns to bookings table
 * 
 * These columns are used to store notes from students and teachers
 * when creating or managing bookings.
 */
export class AddBookingNotes1767000000002 implements MigrationInterface {
  name = 'AddBookingNotes1767000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add student_notes and teacher_notes columns to bookings table
    await queryRunner.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS student_notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS teacher_notes TEXT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.query(`
      ALTER TABLE bookings 
      DROP COLUMN IF EXISTS student_notes,
      DROP COLUMN IF EXISTS teacher_notes;
    `);
  }
}

