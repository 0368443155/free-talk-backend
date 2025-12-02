import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetricsTablesPhase11733112000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if metrics_hourly exists and alter it, or create new
    const hasMetricsHourly = await queryRunner.hasTable('metrics_hourly');
    
    if (hasMetricsHourly) {
      // Alter existing table to match new structure
      await queryRunner.query(`
        ALTER TABLE metrics_hourly
        ADD COLUMN IF NOT EXISTS method VARCHAR(10) DEFAULT 'GET',
        ADD COLUMN IF NOT EXISTS protocol ENUM('http', 'webrtc') DEFAULT 'http',
        ADD COLUMN IF NOT EXISTS hour_start TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS total_requests INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_inbound BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_outbound BIGINT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS avg_response_time DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS max_response_time INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS min_response_time INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      
      // Migrate existing data if needed
      await queryRunner.query(`
        UPDATE metrics_hourly 
        SET hour_start = DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
        WHERE hour_start IS NULL
      `);
      
      // Create unique index
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_endpoint_hour 
        ON metrics_hourly(endpoint, method, hour_start)
      `);
      
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_hour_start ON metrics_hourly(hour_start)
      `);
      
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_protocol ON metrics_hourly(protocol)
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
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS metrics_daily (
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
    
    // Bandwidth alerts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bandwidth_alerts (
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bandwidth_alerts`);
    await queryRunner.query(`DROP TABLE IF EXISTS metrics_daily`);
    // Note: We don't drop metrics_hourly as it may have existing data
  }
}

