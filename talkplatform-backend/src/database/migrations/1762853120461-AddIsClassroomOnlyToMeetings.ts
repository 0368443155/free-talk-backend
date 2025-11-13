import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsClassroomOnlyToMeetings1762853120461 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('meetings', new TableColumn({
            name: 'is_classroom_only',
            type: 'boolean',
            default: false,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('meetings', 'is_classroom_only');
    }

}
