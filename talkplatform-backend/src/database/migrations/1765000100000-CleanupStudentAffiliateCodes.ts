import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Clean up affiliate_code for students
 * 
 * This migration sets affiliate_code to NULL for users who are not verified teachers.
 * Only verified teachers should have affiliate_code.
 */
export class CleanupStudentAffiliateCodes1765000100000 implements MigrationInterface {
    name = 'CleanupStudentAffiliateCodes1765000100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set affiliate_code to NULL for users who are:
        // 1. Not teachers (role != 'teacher'), OR
        // 2. Teachers but not verified (no approved teacher profile)
        
        // First, set affiliate_code to NULL for all non-teacher users
        await queryRunner.query(`
            UPDATE users u
            SET u.affiliate_code = NULL
            WHERE u.role != 'teacher' 
            AND u.affiliate_code IS NOT NULL
        `);

        // Then, set affiliate_code to NULL for teachers who are not verified
        // (teachers without approved teacher profile)
        await queryRunner.query(`
            UPDATE users u
            LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
            SET u.affiliate_code = NULL
            WHERE u.role = 'teacher'
            AND (
                tp.user_id IS NULL 
                OR tp.status != 'approved'
            )
            AND u.affiliate_code IS NOT NULL
        `);

        // Log the cleanup
        const result = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE affiliate_code IS NOT NULL
        `);

        console.log(`✅ Cleaned up affiliate codes. Remaining affiliate codes: ${result[0]?.count || 0}`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This migration cannot be easily reversed since we don't know
        // which affiliate_code values were original and which were generated for students.
        // However, we can leave it as is since setting NULL doesn't break anything.
        console.log('⚠️ CleanupStudentAffiliateCodes migration cannot be fully reversed.');
        console.log('   Original affiliate_code values for students have been lost.');
        console.log('   Only verified teachers should have affiliate_code going forward.');
    }
}

