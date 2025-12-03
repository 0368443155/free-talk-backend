import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetingParticipants1733212800002 implements MigrationInterface {
    name = 'CreateMeetingParticipants1733212800002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const tableExists = await queryRunner.hasTable('meeting_participants');

        if (!tableExists) {
            await queryRunner.query(`
        CREATE TABLE meeting_participants (
          id CHAR(36) PRIMARY KEY,
          meeting_id CHAR(36) NOT NULL,
          user_id CHAR(36) NOT NULL,
          duration_seconds INT DEFAULT 0,
          joined_at TIMESTAMP(6) NOT NULL,
          left_at TIMESTAMP(6) NULL,
          device_type VARCHAR(100) NULL,
          connection_quality VARCHAR(50) NULL,
          created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
          CONSTRAINT fk_meeting_participants_meeting 
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
          CONSTRAINT fk_meeting_participants_user 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT uq_meeting_user UNIQUE (meeting_id, user_id)
        )
      `);

            // Add indexes
            await queryRunner.query(`
        CREATE INDEX idx_meeting_participants_meeting_id 
        ON meeting_participants(meeting_id)
      `);

            await queryRunner.query(`
        CREATE INDEX idx_meeting_participants_user_id 
        ON meeting_participants(user_id)
      `);

            await queryRunner.query(`
        CREATE INDEX idx_meeting_participants_duration 
        ON meeting_participants(duration_seconds)
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS meeting_participants`);
    }
}
