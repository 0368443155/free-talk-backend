import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlockedParticipantsTable1763363543445 implements MigrationInterface {
    name = 'CreateBlockedParticipantsTable1763363543445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_2421677630302069fea29b7abc5\``);
        await queryRunner.query(`ALTER TABLE \`classrooms\` DROP FOREIGN KEY \`FK_cbc7ff02258e2de833978650949\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`meeting_type\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_44dce22b6af24d8bbcd339d967c\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`joined_at\` \`joined_at\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`created_at\` \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`classroom_id\` \`classroom_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`user_id\` \`user_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`created_at\` \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`updated_at\` \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`teacher_id\` \`teacher_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`language\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD \`language\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`topic\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD \`topic\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_44dce22b6af24d8bbcd339d967c\` FOREIGN KEY (\`classroom_id\`) REFERENCES \`classrooms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_2421677630302069fea29b7abc5\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` ADD CONSTRAINT \`FK_cbc7ff02258e2de833978650949\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`classrooms\` DROP FOREIGN KEY \`FK_cbc7ff02258e2de833978650949\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_2421677630302069fea29b7abc5\``);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` DROP FOREIGN KEY \`FK_44dce22b6af24d8bbcd339d967c\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`topic\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD \`topic\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`meetings\` DROP COLUMN \`language\``);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD \`language\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`teacher_id\` \`teacher_id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`updated_at\` \`updated_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` CHANGE \`created_at\` \`created_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`user_id\` \`user_id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`classroom_id\` \`classroom_id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`created_at\` \`created_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` CHANGE \`joined_at\` \`joined_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_44dce22b6af24d8bbcd339d967c\` FOREIGN KEY (\`classroom_id\`) REFERENCES \`classrooms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`meetings\` ADD \`meeting_type\` enum ('class', 'free_talk') NOT NULL DEFAULT 'class'`);
        await queryRunner.query(`ALTER TABLE \`classrooms\` ADD CONSTRAINT \`FK_cbc7ff02258e2de833978650949\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`classroom_members\` ADD CONSTRAINT \`FK_2421677630302069fea29b7abc5\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
