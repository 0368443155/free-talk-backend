-- ============================================
-- CREATE TABLE teacher_verifications
-- ============================================

CREATE TABLE IF NOT EXISTS `teacher_verifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `status` ENUM('pending', 'under_review', 'info_needed', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `documents` JSON NULL,
  `additional_info` JSON NULL,
  `admin_notes` TEXT NULL,
  `rejection_reason` TEXT NULL,
  `reviewed_by` VARCHAR(36) NULL,
  `verified_at` TIMESTAMP NULL,
  `resubmission_count` INT NOT NULL DEFAULT 0,
  `last_submitted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  
  INDEX `IDX_teacher_verifications_user_id` (`user_id`),
  INDEX `IDX_teacher_verifications_status` (`status`),
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

