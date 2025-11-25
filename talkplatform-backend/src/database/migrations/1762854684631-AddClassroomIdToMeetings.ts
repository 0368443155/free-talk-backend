import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddClassroomIdToMeetings1762854684631 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if classroom_id column already exists (it might have been created in InitialSchema)
        const table = await queryRunner.getTable('meetings');
        const hasClassroomId = table?.columns.find(col => col.name === 'classroom_id');
        
        if (!hasClassroomId) {
            // Add classroom_id column (without foreign key since classrooms table doesn't exist yet)
            await queryRunner.addColumn('meetings', new TableColumn({
                name: 'classroom_id',
                type: 'varchar',
                length: '36',
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop column
        await queryRunner.dropColumn('meetings', 'classroom_id');
    }

}
