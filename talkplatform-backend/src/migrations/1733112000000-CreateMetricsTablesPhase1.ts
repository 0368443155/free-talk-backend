import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetricsTablesPhase11733112000000 implements MigrationInterface {
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

    // Helper function to safely create index
    const createIndexSafe = async (sql: string) => {
      try {
        await queryRunner.query(sql);
      } catch (error: any) {
        // Ignore duplicate key name error (1061) or index already exists
        if (error.errno !== 1061 && error.code !== 'ER_DUP_KEYNAME') {
          console.warn('Warning creating index:', error.message);
        }
      }
    };

    // Check if metrics_hourly exists and alter it, or create new
    const hasMetricsHourly = await queryRunner.hasTable('metrics_hourly');

    if (hasMetricsHourly) {
      // Alter existing table to match new structure
      if (!(await columnExists('metrics_hourly', 'method'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN method VARCHAR(10) DEFAULT 'GET'`);
      }
      if (!(await columnExists('metrics_hourly', 'protocol'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN protocol ENUM('http', 'webrtc') DEFAULT 'http'`);
      }
      if (!(await columnExists('metrics_hourly', 'hour_start'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN hour_start TIMESTAMP NULL`);
      }
      if (!(await columnExists('metrics_hourly', 'total_requests'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN total_requests INT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'total_inbound'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN total_inbound BIGINT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'total_outbound'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN total_outbound BIGINT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'avg_response_time'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN avg_response_time DECIMAL(10,2) DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'max_response_time'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN max_response_time INT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'min_response_time'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN min_response_time INT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'error_count'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN error_count INT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'success_count'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN success_count INT DEFAULT 0`);
      }
      if (!(await columnExists('metrics_hourly', 'created_at'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      }
      if (!(await columnExists('metrics_hourly', 'updated_at'))) {
        await queryRunner.query(`ALTER TABLE metrics_hourly ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      }

      // Migrate existing data if needed AND if timestamp column exists
      if (await columnExists('metrics_hourly', 'timestamp')) {
        await queryRunner.query(`
          UPDATE metrics_hourly 
          SET hour_start = DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
          WHERE hour_start IS NULL AND timestamp IS NOT NULL
        `);
      }

      // Create unique index safely
      await createIndexSafe(`
        CREATE UNIQUE INDEX idx_endpoint_hour 
        ON metrics_hourly(endpoint, method, hour_start)
      `);

      await createIndexSafe(`
        CREATE INDEX idx_hour_start ON metrics_hourly(hour_start)
      `);

      await createIndexSafe(`
        CREATE INDEX idx_protocol ON metrics_hourly(protocol)
      `);

    } else {
      // Create new table
      await queryRunner.query(`
        CREATE TABLE metrics_hourly (
          id VARCHAR(36) PRIMARY KEY,
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          protocol ENUM('http', 'webrtc') DEFAULT 'http',
          hour_start TIMESTAMP NOT NULL,
          total_requests INT DEFAULT 0,
          total_inbound BIGINT DEFAULT 0,
          total_outbound BIGINT DEFAULT 0,
          avg_response_time DECIMAL(10,2) DEFAULT 0,
          max_response_time INT DEFAULT 0,
          min_response_time INT DEFAULT 0,
          error_count INT DEFAULT 0,
          success_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_endpoint_hour (endpoint, method, hour_start),
          INDEX idx_hour_start (hour_start),
          INDEX idx_protocol (protocol)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // Daily aggregates (for reports)
    const hasMetricsDaily = await queryRunner.hasTable('metrics_daily');
    if (!hasMetricsDaily) {
      await queryRunner.query(`
        CREATE TABLE metrics_daily (
          id VARCHAR(36) PRIMARY KEY,
          date DATE NOT NULL,
          protocol ENUM('http', 'webrtc') DEFAULT 'http',
          total_bandwidth BIGINT DEFAULT 0,
          total_requests INT DEFAULT 0,
          avg_response_time DECIMAL(10,2) DEFAULT 0,
          peak_bandwidth BIGINT DEFAULT 0,
          peak_hour TIMESTAMP NULL,
          unique_users INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY idx_date_protocol (date, protocol),
          INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // Bandwidth alerts
    const hasBandwidthAlerts = await queryRunner.hasTable('bandwidth_alerts');
    if (!hasBandwidthAlerts) {
      await queryRunner.query(`
        CREATE TABLE bandwidth_alerts (
          id VARCHAR(36) PRIMARY KEY,
          alert_type ENUM('threshold', 'spike', 'anomaly') NOT NULL,
          severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
          message TEXT NOT NULL,
          metric_value BIGINT NOT NULL,
          threshold_value BIGINT NULL,
          endpoint VARCHAR(255) NULL,
          protocol ENUM('http', 'webrtc') NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP NULL,
          INDEX idx_created (created_at),
          INDEX idx_severity (severity),
          INDEX idx_protocol (protocol)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bandwidth_alerts`);
    await queryRunner.query(`DROP TABLE IF EXISTS metrics_daily`);
    // Note: We don't drop metrics_hourly as it may have existing data
  }
}
