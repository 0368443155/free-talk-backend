import { MigrationInterface, QueryRunner } from "typeorm";

export class RmPhoneToUser1762157070034 implements MigrationInterface {
    name = 'RmPhoneToUser1762157070034'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone\` varchar(20) NULL`);
    }

}
