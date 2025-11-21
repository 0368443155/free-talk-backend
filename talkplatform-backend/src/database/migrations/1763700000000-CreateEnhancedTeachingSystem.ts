import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnhancedTeachingSystem1763700000000 implements MigrationInterface {
  name = 'CreateEnhancedTeachingSystem1763700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create teacher status enum
    await queryRunner.query(`
      CREATE TYPE "teacher_profiles_status_enum" AS ENUM('pending', 'approved', 'suspended', 'rejected')
    `);

    // Create teacher specialty enum
    await queryRunner.query(`
      CREATE TYPE "teacher_profiles_specialty_enum" AS ENUM('conversation', 'business', 'academic', 'test_prep', 'kids', 'pronunciation', 'grammar', 'writing')
    `);

    // Create teacher profiles table
    await queryRunner.query(`
      CREATE TABLE \`teacher_profiles\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`status\` enum('pending', 'approved', 'suspended', 'rejected') NOT NULL DEFAULT 'pending',
        \`is_verified\` boolean NOT NULL DEFAULT false,
        \`is_available\` boolean NOT NULL DEFAULT true,
        \`headline\` varchar(500) NOT NULL,
        \`bio\` text NOT NULL,
        \`languages_taught\` json NOT NULL,
        \`specialties\` json NOT NULL,
        \`education\` varchar(200) NULL,
        \`certifications\` json NULL,
        \`years_experience\` int NOT NULL DEFAULT 0,
        \`timezone\` varchar(200) NULL,
        \`spoken_languages\` json NULL,
        \`intro_video_url\` varchar(500) NULL,
        \`profile_images\` json NULL,
        \`hourly_rate_credits\` decimal(3,2) NOT NULL DEFAULT 0,
        \`min_session_duration\` int NOT NULL DEFAULT 30,
        \`max_session_duration\` int NOT NULL DEFAULT 120,
        \`teaching_styles\` json NULL,
        \`age_groups\` json NULL,
        \`average_rating\` decimal(3,2) NOT NULL DEFAULT 0,
        \`total_reviews\` int NOT NULL DEFAULT 0,
        \`total_hours_taught\` decimal(8,2) NOT NULL DEFAULT 0,
        \`total_students\` int NOT NULL DEFAULT 0,
        \`repeat_students\` int NOT NULL DEFAULT 0,
        \`response_rate\` decimal(5,2) NOT NULL DEFAULT 0,
        \`avg_response_time_hours\` int NOT NULL DEFAULT 24,
        \`total_earnings\` decimal(10,2) NOT NULL DEFAULT 0,
        \`monthly_earnings\` decimal(10,2) NOT NULL DEFAULT 0,
        \`classes_this_month\` int NOT NULL DEFAULT 0,
        \`completion_rate\` decimal(5,2) NOT NULL DEFAULT 100,
        \`affiliate_code\` varchar(50) NULL,
        \`affiliate_referrals\` int NOT NULL DEFAULT 0,
        \`affiliate_earnings\` decimal(10,2) NOT NULL DEFAULT 0,
        \`auto_approve_bookings\` boolean NOT NULL DEFAULT true,
        \`booking_lead_time_hours\` int NOT NULL DEFAULT 24,
        \`allow_instant_booking\` boolean NOT NULL DEFAULT true,
        \`cancellation_policy\` json NULL,
        \`admin_notes\` text NULL,
        \`verified_at\` timestamp NULL,
        \`last_active_at\` timestamp NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_teacher_profiles_affiliate_code\` (\`affiliate_code\`),
        INDEX \`IDX_teacher_profiles_status_verified\` (\`status\`, \`is_verified\`),
        INDEX \`IDX_teacher_profiles_rating_hours\` (\`average_rating\`, \`total_hours_taught\`),
        UNIQUE INDEX \`REL_teacher_profiles_user\` (\`user_id\`),
        CONSTRAINT \`FK_teacher_profiles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create teacher reviews table
    await queryRunner.query(`
      CREATE TABLE \`teacher_reviews\` (
        \`id\` varchar(36) NOT NULL,
        \`teacher_id\` varchar(36) NOT NULL,
        \`student_id\` varchar(36) NOT NULL,
        \`meeting_id\` varchar(36) NULL,
        \`rating\` decimal(2,1) NOT NULL,
        \`comment\` text NULL,
        \`detailed_ratings\` json NULL,
        \`tags\` json NULL,
        \`is_anonymous\` boolean NOT NULL DEFAULT false,
        \`is_public\` boolean NOT NULL DEFAULT true,
        \`is_featured\` boolean NOT NULL DEFAULT false,
        \`teacher_response\` text NULL,
        \`teacher_responded_at\` timestamp NULL,
        \`is_verified\` boolean NOT NULL DEFAULT false,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_teacher_reviews_teacher_created\` (\`teacher_id\`, \`created_at\`),
        INDEX \`IDX_teacher_reviews_rating_created\` (\`rating\`, \`created_at\`),
        CONSTRAINT \`FK_teacher_reviews_teacher\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`teacher_profiles\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_teacher_reviews_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_teacher_reviews_meeting\` FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    // Create teacher availability table
    await queryRunner.query(`
      CREATE TABLE \`teacher_availability\` (
        \`id\` varchar(36) NOT NULL,
        \`teacher_id\` varchar(36) NOT NULL,
        \`availability_type\` enum('regular', 'exception', 'vacation') NOT NULL DEFAULT 'regular',
        \`day_of_week\` enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NULL,
        \`date\` date NULL,
        \`start_time\` time NOT NULL,
        \`end_time\` time NOT NULL,
        \`timezone\` varchar(100) NULL,
        \`is_available\` boolean NOT NULL DEFAULT true,
        \`notes\` varchar(500) NULL,
        \`max_bookings\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_teacher_availability_teacher_day\` (\`teacher_id\`, \`day_of_week\`),
        INDEX \`IDX_teacher_availability_teacher_date\` (\`teacher_id\`, \`date\`, \`availability_type\`),
        CONSTRAINT \`FK_teacher_availability_teacher\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`teacher_profiles\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create credit packages table
    await queryRunner.query(`
      CREATE TABLE \`credit_packages\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(200) NOT NULL,
        \`description\` varchar(1000) NULL,
        \`credit_amount\` int NOT NULL,
        \`usd_price\` decimal(10,2) NOT NULL,
        \`vnd_price\` decimal(10,2) NULL,
        \`bonus_credits\` int NOT NULL DEFAULT 0,
        \`discount_percentage\` decimal(5,2) NULL,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`is_featured\` boolean NOT NULL DEFAULT false,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`features\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create credit transactions table
    await queryRunner.query(`
      CREATE TABLE \`credit_transactions\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`transaction_type\` enum('purchase', 'deduction', 'refund', 'donation', 'earning', 'affiliate_bonus') NOT NULL,
        \`status\` enum('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        \`credit_amount\` decimal(10,2) NOT NULL,
        \`usd_amount\` decimal(10,2) NULL,
        \`currency\` varchar(3) NULL,
        \`description\` varchar(1000) NULL,
        \`payment_provider\` enum('stripe', 'paypal', 'vnpay', 'internal') NULL,
        \`external_transaction_id\` varchar(500) NULL,
        \`payment_metadata\` json NULL,
        \`meeting_id\` varchar(36) NULL,
        \`teacher_id\` varchar(36) NULL,
        \`affiliate_code\` varchar(200) NULL,
        \`platform_fee_percentage\` decimal(5,2) NULL,
        \`platform_fee_amount\` decimal(10,2) NULL,
        \`teacher_amount\` decimal(10,2) NULL,
        \`balance_before\` decimal(10,2) NULL,
        \`balance_after\` decimal(10,2) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`processed_at\` timestamp NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_credit_transactions_user_created\` (\`user_id\`, \`created_at\`),
        INDEX \`IDX_credit_transactions_type_status\` (\`transaction_type\`, \`status\`),
        CONSTRAINT \`FK_credit_transactions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_credit_transactions_meeting\` FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_credit_transactions_teacher\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    // Insert default credit packages
    await queryRunner.query(`
      INSERT INTO \`credit_packages\` (\`id\`, \`name\`, \`description\`, \`credit_amount\`, \`usd_price\`, \`bonus_credits\`, \`sort_order\`, \`features\`) VALUES
      (UUID(), 'Starter Pack', 'Perfect for trying out the platform', 10, 9.99, 0, 1, JSON_ARRAY('Basic support', '30-day validity')),
      (UUID(), 'Popular Pack', 'Most popular choice for regular learners', 50, 39.99, 5, 2, JSON_ARRAY('Priority support', '90-day validity', '+5 bonus credits')),
      (UUID(), 'Value Pack', 'Best value for frequent learners', 100, 69.99, 15, 3, JSON_ARRAY('Premium support', '180-day validity', '+15 bonus credits')),
      (UUID(), 'Premium Pack', 'For serious language learners', 200, 119.99, 40, 4, JSON_ARRAY('VIP support', 'No expiry', '+40 bonus credits', 'Priority booking'))
    `);

    // Add affiliate_code to users table if not exists
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`affiliate_code\` varchar(50) NULL,
      ADD COLUMN \`refferrer_id\` varchar(36) NULL,
      ADD INDEX \`IDX_users_affiliate_code\` (\`affiliate_code\`),
      ADD INDEX \`IDX_users_refferrer\` (\`refferrer_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`affiliate_code\`, DROP COLUMN \`refferrer_id\``);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE \`credit_transactions\``);
    await queryRunner.query(`DROP TABLE \`credit_packages\``);
    await queryRunner.query(`DROP TABLE \`teacher_availability\``);
    await queryRunner.query(`DROP TABLE \`teacher_reviews\``);
    await queryRunner.query(`DROP TABLE \`teacher_profiles\``);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "teacher_profiles_specialty_enum"`);
    await queryRunner.query(`DROP TYPE "teacher_profiles_status_enum"`);
  }
}