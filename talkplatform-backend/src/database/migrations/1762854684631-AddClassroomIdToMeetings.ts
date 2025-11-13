import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddClassroomIdToMeetings1762854684631 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add classroom_id column (without foreign key since classrooms table doesn't exist yet)
        await queryRunner.addColumn('meetings', new TableColumn({
            name: 'classroom_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop column
        await queryRunner.dropColumn('meetings', 'classroom_id');
    }

}
