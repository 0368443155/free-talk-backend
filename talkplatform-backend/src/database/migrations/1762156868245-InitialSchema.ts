import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762156868245 implements MigrationInterface {
    name = 'InitialSchema1762156868245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`teacher_profiles\` (\`user_id\` varchar(36) NOT NULL, \`headline\` varchar(255) NULL, \`bio\` text NULL, \`intro_video_url\` varchar(255) NULL, \`hourly_rate\` int NOT NULL DEFAULT '1', \`average_rating\` float NOT NULL DEFAULT '0', \`total_hours_taught\` int NOT NULL DEFAULT '0', \`is_verified\` tinyint NOT NULL DEFAULT 0, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(100) NOT NULL, \`username\` varchar(50) NOT NULL, \`password\` varchar(255) NOT NULL, \`avartar_url\` varchar(255) NULL, \`phone\` varchar(20) NULL, \`role\` enum ('student', 'teacher', 'admin') NOT NULL DEFAULT 'student', \`credit_balance\` int NOT NULL DEFAULT '0', \`affiliate_code\` char(20) NULL, \`refferrer_id\` char(36) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), UNIQUE INDEX \`IDX_0461eb0a6d65c6b951b4a1d0a4\` (\`affiliate_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meeting_participants\` (\`id\` varchar(36) NOT NULL, \`role\` enum ('host', 'moderator', 'participant') NOT NULL DEFAULT 'participant', \`is_muted\` tinyint NOT NULL DEFAULT 0, \`is_video_off\` tinyint NOT NULL DEFAULT 0, \`is_screen_sharing\` tinyint NOT NULL DEFAULT 0, \`is_hand_raised\` tinyint NOT NULL DEFAULT 0, \`is_kicked\` tinyint NOT NULL DEFAULT 0, \`is_online\` tinyint NOT NULL DEFAULT 0, \`joined_at\` timestamp NOT NULL, \`left_at\` timestamp NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`meeting_id\` varchar(36) NULL, \`user_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meeting_chat_messages\` (\`id\` varchar(36) NOT NULL, \`message\` text NOT NULL, \`type\` enum ('text', 'system', 'reaction') NOT NULL DEFAULT 'text', \`metadata\` json NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`meeting_id\` varchar(36) NULL, \`sender_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`classrooms\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`cover_image\` varchar(500) NULL, \`settings\` json NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`teacher_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`classroom_members\` (\`id\` varchar(36) NOT NULL, \`role\` enum ('student', 'assistant') NOT NULL DEFAULT 'student', \`joined_at\` timestamp NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`classroom_id\` varchar(36) NULL, \`user_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`meetings\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`is_private\` tinyint NOT NULL DEFAULT 0, \`is_locked\` tinyint NOT NULL DEFAULT 0, \`status\` enum ('scheduled', 'live', 'ended', 'cancelled') NOT NULL DEFAULT 'scheduled', \`scheduled_at\` timestamp NULL, \`started_at\` timestamp NULL, \`ended_at\` timestamp NULL, \`max_participants\` int NOT NULL DEFAULT '100', \`youtube_video_id\` varchar(255) NULL, \`youtube_current_time\` float NOT NULL DEFAULT '0', \`youtube_is_playing\` tinyint NOT NULL DEFAULT 0, \`settings\` json NULL, \`recording_url\` varchar(500) NULL, \`total_participants\` int NOT NULL DEFAULT '0', \`current_participants\` int NOT NULL DEFAULT '0', \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`classroom_id\` varchar(36) NULL, \`host_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`teacher_profiles\` ADD CONSTRAINT \`FK_b9627de400103265c502c57b56b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meeting_participants\` ADD CONSTRAINT \`FK_4d2e803caeb25541cc89f2efa5b\` FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meeting_participants\` ADD CONSTRAINT \`FK_4743681bb404d50f8000e2a8228\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meeting_chat_messages\` ADD CONSTRAINT \`FK_8767464189bc9ca1a8caba2e435\` FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meeting_chat_messages\` ADD CONSTRAINT \`FK_360f59c309be4d31db506879f43\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` ADD CONSTRAINT \`FK_cbc7ff02258e2de833978650949\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_44dce22b6af24d8bbcd339d967c\` FOREIGN KEY (\`classroom_id\`) REFERENCES \`classrooms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_2421677630302069fea29b7abc5\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD CONSTRAINT \`FK_5befcfedb28339329b34c228cdc\` FOREIGN KEY (\`classroom_id\`) REFERENCES \`classrooms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD CONSTRAINT \`FK_6bf7c3bf900ea781101614178d0\` FOREIGN KEY (\`host_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP FOREIGN KEY \`FK_6bf7c3bf900ea781101614178d0\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP FOREIGN KEY \`FK_5befcfedb28339329b34c228cdc\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_2421677630302069fea29b7abc5\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_44dce22b6af24d8bbcd339d967c\``);
        await queryRunner.query(`ALTER TABLE \`classrooms\` DROP FOREIGN KEY \`FK_cbc7ff02258e2de833978650949\``);
        await queryRunner.query(`ALTER TABLE \`meeting_chat_messages\` DROP FOREIGN KEY \`FK_360f59c309be4d31db506879f43\``);
        await queryRunner.query(`ALTER TABLE \`meeting_chat_messages\` DROP FOREIGN KEY \`FK_8767464189bc9ca1a8caba2e435\``);
        await queryRunner.query(`ALTER TABLE \`meeting_participants\` DROP FOREIGN KEY \`FK_4743681bb404d50f8000e2a8228\``);
        await queryRunner.query(`ALTER TABLE \`meeting_participants\` DROP FOREIGN KEY \`FK_4d2e803caeb25541cc89f2efa5b\``);
        await queryRunner.query(`ALTER TABLE \`teacher_profiles\` DROP FOREIGN KEY \`FK_b9627de400103265c502c57b56b\``);
        await queryRunner.query(`DROP TABLE \`meetings\``);
        await queryRunner.query(`DROP TABLE \`classroom_members\``);
        await queryRunner.query(`DROP TABLE \`classrooms\``);
        await queryRunner.query(`DROP TABLE \`meeting_chat_messages\``);
        await queryRunner.query(`DROP TABLE \`meeting_participants\``);
        await queryRunner.query(`DROP INDEX \`IDX_0461eb0a6d65c6b951b4a1d0a4\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`teacher_profiles\``);
    }

}
