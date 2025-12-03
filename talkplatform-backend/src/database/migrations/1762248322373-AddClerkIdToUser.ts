import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClerkIdToUser1762248322373 implements MigrationInterface {
    name = 'AddClerkIdToUser1762248322373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper function to check if column exists
        const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
            const result = await queryRunner.query(
                `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE table_schema = DATABASE() 
                 AND table_name = ? 
                 AND column_name = ?`,
                [tableName, columnName]
            );
            return result[0].count > 0;
        };

        if (!(await columnExists('users', 'clerkId'))) {
            await queryRunner.query(`ALTER TABLE \`users\` ADD \`clerkId\` varchar(255) NULL`);
        }

        // Change password column to nullable (always safe to run multiple times if it's just changing type)
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`password\` \`password\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`password\` \`password\` varchar(255) NOT NULL`);

        // Helper function to check if column exists
        const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
            const result = await queryRunner.query(
                `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE table_schema = DATABASE() 
                 AND table_name = ? 
                 AND column_name = ?`,
                [tableName, columnName]
            );
            return result[0].count > 0;
        };

        if (await columnExists('users', 'clerkId')) {
            await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`clerkId\``);
        }
    }

}
