import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1763906116462 implements MigrationInterface {
    name = 'Migrations1763906116462'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_meetings_language_level\` ON \`meetings\``);
        await queryRunner.query(`DROP INDEX \`IDX_meetings_meeting_type\` ON \`meetings\``);
        await queryRunner.query(`DROP INDEX \`IDX_meetings_region\` ON \`meetings\``);
        await queryRunner.query(`DROP INDEX \`IDX_meetings_status_room_status\` ON \`meetings\``);
        await queryRunner.query(`DROP INDEX \`IDX_users_affiliate_code\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_users_refferrer\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_BANDWIDTH_METRICS_TIMESTAMP\` ON \`bandwidth_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_METRICS_HOURLY_ENDPOINT\` ON \`metrics_hourly\``);
        await queryRunner.query(`DROP INDEX \`IDX_METRICS_HOURLY_TIMESTAMP\` ON \`metrics_hourly\``);
        await queryRunner.query(`DROP INDEX \`IDX_livekit_metrics_meeting_timestamp\` ON \`livekit_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_livekit_metrics_meeting_user_timestamp\` ON \`livekit_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_livekit_metrics_quality\` ON \`livekit_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_livekit_metrics_timestamp\` ON \`livekit_metrics\``);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` DROP COLUMN \`method\``);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` ADD \`method\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` CHANGE \`timestamp\` \`timestamp\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`metrics_hourly\` CHANGE \`timestamp\` \`timestamp\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` DROP COLUMN \`platform\``);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` ADD \`platform\` varchar(255) NOT NULL DEFAULT 'livekit'`);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`CREATE INDEX \`IDX_572d1f7fd38b1f9e399e8eb31b\` ON \`bandwidth_metrics\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_df56d9cb466972f6192e2a3256\` ON \`metrics_hourly\` (\`endpoint\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_c94f9623859d9b6c3b62eec0c1\` ON \`metrics_hourly\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_6ed4e2c6047685fa96fae1cc9f\` ON \`livekit_metrics\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_b14580d94eb44e47ea12257f4c\` ON \`livekit_metrics\` (\`meetingId\`, \`userId\`, \`timestamp\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_b14580d94eb44e47ea12257f4c\` ON \`livekit_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_6ed4e2c6047685fa96fae1cc9f\` ON \`livekit_metrics\``);
        await queryRunner.query(`DROP INDEX \`IDX_c94f9623859d9b6c3b62eec0c1\` ON \`metrics_hourly\``);
        await queryRunner.query(`DROP INDEX \`IDX_df56d9cb466972f6192e2a3256\` ON \`metrics_hourly\``);
        await queryRunner.query(`DROP INDEX \`IDX_572d1f7fd38b1f9e399e8eb31b\` ON \`bandwidth_metrics\``);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` ADD \`createdAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` DROP COLUMN \`platform\``);
        await queryRunner.query(`ALTER TABLE \`livekit_metrics\` ADD \`platform\` varchar(50) COLLATE "utf8mb4_0900_ai_ci" NOT NULL DEFAULT 'livekit'`);
        await queryRunner.query(`ALTER TABLE \`metrics_hourly\` CHANGE \`timestamp\` \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` CHANGE \`timestamp\` \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` DROP COLUMN \`method\``);
        await queryRunner.query(`ALTER TABLE \`bandwidth_metrics\` ADD \`method\` varchar(10) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_livekit_metrics_timestamp\` ON \`livekit_metrics\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_livekit_metrics_quality\` ON \`livekit_metrics\` (\`quality\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_livekit_metrics_meeting_user_timestamp\` ON \`livekit_metrics\` (\`meetingId\`, \`userId\`, \`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_livekit_metrics_meeting_timestamp\` ON \`livekit_metrics\` (\`meetingId\`, \`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_METRICS_HOURLY_TIMESTAMP\` ON \`metrics_hourly\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_METRICS_HOURLY_ENDPOINT\` ON \`metrics_hourly\` (\`endpoint\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_BANDWIDTH_METRICS_TIMESTAMP\` ON \`bandwidth_metrics\` (\`timestamp\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_users_refferrer\` ON \`users\` (\`refferrer_id\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_users_affiliate_code\` ON \`users\` (\`affiliate_code\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_meetings_status_room_status\` ON \`meetings\` (\`status\`, \`room_status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_meetings_region\` ON \`meetings\` (\`region\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_meetings_meeting_type\` ON \`meetings\` (\`meeting_type\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_meetings_language_level\` ON \`meetings\` (\`language\`, \`level\`)`);
    }

}
