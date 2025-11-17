import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockedParticipantsTable1763363691315 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE blocked_participants (
                id VARCHAR(36) PRIMARY KEY,
                meeting_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                blocked_by VARCHAR(36) NOT NULL,
                reason VARCHAR(500) NULL,
                created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                INDEX idx_blocked_meeting_user (meeting_id, user_id),
                CONSTRAINT FK_blocked_participants_meeting_id FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
                CONSTRAINT FK_blocked_participants_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT FK_blocked_participants_blocked_by FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE blocked_participants`);
    }

}
