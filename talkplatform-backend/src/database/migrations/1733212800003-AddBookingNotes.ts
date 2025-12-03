import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingNotes1733212800003 implements MigrationInterface {
    name = 'AddBookingNotes1733212800003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const bookingTable = await queryRunner.getTable('bookings');

        if (!bookingTable?.findColumnByName('student_notes')) {
            await queryRunner.query(`
        ALTER TABLE bookings 
        ADD COLUMN student_notes TEXT NULL
      `);
        }

        if (!bookingTable?.findColumnByName('teacher_notes')) {
            await queryRunner.query(`
        ALTER TABLE bookings 
        ADD COLUMN teacher_notes TEXT NULL
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const bookingTable = await queryRunner.getTable('bookings');

        if (bookingTable?.findColumnByName('student_notes')) {
            await queryRunner.query(`ALTER TABLE bookings DROP COLUMN student_notes`);
        }

        if (bookingTable?.findColumnByName('teacher_notes')) {
            await queryRunner.query(`ALTER TABLE bookings DROP COLUMN teacher_notes`);
        }
    }
}
