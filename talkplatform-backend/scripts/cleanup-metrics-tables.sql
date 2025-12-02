-- ============================================
-- CLEANUP OLD METRICS TABLES
-- Date: 2025-12-02
-- Purpose: Remove old metrics tables and create new optimized ones
-- ============================================

-- Show current metrics tables
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE '%metrics%'
ORDER BY TABLE_NAME;

-- ============================================
-- STEP 1: BACKUP DATA (Optional)
-- ============================================

-- If you want to backup data before dropping:
-- CREATE TABLE bandwidth_metrics_backup AS SELECT * FROM bandwidth_metrics;
-- CREATE TABLE metrics_hourly_backup AS SELECT * FROM metrics_hourly;
-- CREATE TABLE livekit_metrics_backup AS SELECT * FROM livekit_metrics;

-- ============================================
-- STEP 2: DROP OLD TABLES
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `livekit_metrics`;
DROP TABLE IF EXISTS `bandwidth_metrics`;
DROP TABLE IF EXISTS `metrics_hourly`;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Old metrics tables dropped' AS Status;

-- ============================================
-- STEP 3: CREATE NEW OPTIMIZED TABLES
-- ============================================

-- Table 1: metrics_hourly (Hourly aggregates)
CREATE TABLE `metrics_hourly` (
  `id` VARCHAR(36) PRIMARY KEY,
  `endpoint` VARCHAR(255) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `protocol` ENUM('http', 'webrtc') DEFAULT 'http',
  `hour_start` TIMESTAMP NOT NULL,
  `total_requests` INT DEFAULT 0,
  `total_inbound` BIGINT DEFAULT 0,
  `total_outbound` BIGINT DEFAULT 0,
  `avg_response_time` DECIMAL(10,2) DEFAULT 0,
  `max_response_time` INT DEFAULT 0,
  `min_response_time` INT DEFAULT 0,
  `error_count` INT DEFAULT 0,
  `success_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_endpoint_hour` (`endpoint`, `method`, `hour_start`),
  INDEX `idx_hour_start` (`hour_start`),
  INDEX `idx_protocol` (`protocol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ metrics_hourly created' AS Status;

-- Table 2: metrics_daily (Daily aggregates)
CREATE TABLE `metrics_daily` (
  `id` VARCHAR(36) PRIMARY KEY,
  `date` DATE NOT NULL,
  `protocol` ENUM('http', 'webrtc') DEFAULT 'http',
  `total_bandwidth` BIGINT DEFAULT 0,
  `total_requests` INT DEFAULT 0,
  `avg_response_time` DECIMAL(10,2) DEFAULT 0,
  `peak_bandwidth` BIGINT DEFAULT 0,
  `peak_hour` TIMESTAMP NULL,
  `unique_users` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_date_protocol` (`date`, `protocol`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ metrics_daily created' AS Status;

-- Table 3: bandwidth_alerts (Alerts)
CREATE TABLE `bandwidth_alerts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `alert_type` ENUM('threshold', 'spike', 'anomaly') NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  `message` TEXT NOT NULL,
  `metric_value` BIGINT NOT NULL,
  `threshold_value` BIGINT,
  `endpoint` VARCHAR(255),
  `protocol` ENUM('http', 'webrtc'),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  INDEX `idx_created` (`created_at`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_protocol` (`protocol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ bandwidth_alerts created' AS Status;

-- ============================================
-- STEP 4: VERIFY NEW TABLES
-- ============================================

-- Show all metrics tables
SHOW TABLES LIKE '%metrics%';

-- Show structure of new tables
DESCRIBE metrics_hourly;
DESCRIBE metrics_daily;
DESCRIBE bandwidth_alerts;

-- Show indexes
SHOW INDEX FROM metrics_hourly;
SHOW INDEX FROM metrics_daily;
SHOW INDEX FROM bandwidth_alerts;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
    '✅ Migration Complete' AS Status,
    'Old tables dropped: livekit_metrics, bandwidth_metrics, metrics_hourly (old)' AS Dropped,
    'New tables created: metrics_hourly (new), metrics_daily, bandwidth_alerts' AS Created;

-- ============================================
-- CLEANUP (Optional)
-- ============================================

-- If you created backups and want to remove them:
-- DROP TABLE IF EXISTS bandwidth_metrics_backup;
-- DROP TABLE IF EXISTS metrics_hourly_backup;
-- DROP TABLE IF EXISTS livekit_metrics_backup;
