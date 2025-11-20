import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLiveKitMetricsTable1763500000000 implements MigrationInterface {
  name = 'CreateLiveKitMetricsTable1763500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'livekit_metrics',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'meetingId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '50',
            default: "'livekit'",
          },
          {
            name: 'timestamp',
            type: 'bigint',
          },
          {
            name: 'bitrate',
            type: 'int',
            default: 0,
          },
          {
            name: 'packetLoss',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'jitter',
            type: 'int',
            default: 0,
          },
          {
            name: 'rtt',
            type: 'int',
            default: 0,
          },
          {
            name: 'quality',
            type: 'enum',
            enum: ['excellent', 'good', 'fair', 'poor'],
            default: "'good'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IDX_livekit_metrics_meeting_user_timestamp 
      ON livekit_metrics (meetingId, userId, timestamp)
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_livekit_metrics_timestamp 
      ON livekit_metrics (timestamp)
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_livekit_metrics_meeting_timestamp 
      ON livekit_metrics (meetingId, timestamp)
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_livekit_metrics_quality 
      ON livekit_metrics (quality)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('livekit_metrics');
  }
}