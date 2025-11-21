-- ============================================
-- MISSING TABLES FOR TALKPLATFORM
-- Created: 2025-11-21
-- Purpose: Add missing tables for complete functionality
-- ============================================

-- ============================================
-- MODULE 2: TEACHER PROFILE ENHANCEMENTS
-- ============================================

-- Teacher media (photos, videos, certificates)
CREATE TABLE IF NOT EXISTS teacher_media (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id CHAR(36) NOT NULL,
    media_type ENUM('intro_video', 'profile_image', 'certificate', 'degree', 'other') NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    title VARCHAR(255),
    description TEXT,
    file_size INT COMMENT 'File size in bytes',
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE COMMENT 'Admin verification status',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher_media_teacher (teacher_id),
    INDEX idx_teacher_media_type (media_type),
    INDEX idx_teacher_media_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher ranking history
CREATE TABLE IF NOT EXISTS teacher_rankings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id CHAR(36) NOT NULL,
    ranking_score DECIMAL(10, 2) NOT NULL COMMENT 'Calculated ranking score',
    tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
    rating_score DECIMAL(5, 2) COMMENT 'Contribution from rating (40%)',
    hours_score DECIMAL(5, 2) COMMENT 'Contribution from hours taught (30%)',
    reviews_score DECIMAL(5, 2) COMMENT 'Contribution from review count (15%)',
    response_score DECIMAL(5, 2) COMMENT 'Contribution from response rate (10%)',
    completion_score DECIMAL(5, 2) COMMENT 'Contribution from completion rate (5%)',
    rank_position INT COMMENT 'Overall rank position',
    calculated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher_ranking_teacher (teacher_id),
    INDEX idx_teacher_ranking_score (ranking_score DESC),
    INDEX idx_teacher_ranking_tier (tier),
    INDEX idx_teacher_ranking_date (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MODULE 3: FREE TALK ENHANCEMENTS
-- ============================================

-- Global chat (lobby chat, not meeting-specific)
CREATE TABLE IF NOT EXISTS global_chat_messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    room_type VARCHAR(50) DEFAULT 'lobby' COMMENT 'lobby, general, language-specific',
    message TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_global_chat_room (room_type),
    INDEX idx_global_chat_user (user_id),
    INDEX idx_global_chat_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User matching preferences
CREATE TABLE IF NOT EXISTS user_matching_preferences (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    preferred_languages JSON COMMENT 'Array of language codes',
    preferred_regions JSON COMMENT 'Array of region codes',
    preferred_levels JSON COMMENT 'Array of skill levels',
    preferred_topics JSON COMMENT 'Array of topics',
    auto_match BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Match history
CREATE TABLE IF NOT EXISTS match_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    meeting_id CHAR(36) NOT NULL,
    matched_by ENUM('auto', 'manual', 'invite') DEFAULT 'auto',
    match_score DECIMAL(5, 2) COMMENT 'How well the match fits user preferences',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    INDEX idx_match_history_user (user_id),
    INDEX idx_match_history_meeting (meeting_id),
    INDEX idx_match_history_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MODULE 4: CLASSROOM ENHANCEMENTS
-- ============================================

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    meeting_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    teacher_id CHAR(36) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    credits_paid INT NOT NULL,
    credits_refunded INT DEFAULT 0,
    scheduled_at TIMESTAMP(6) NOT NULL,
    cancelled_at TIMESTAMP(6) NULL,
    cancellation_reason TEXT,
    cancelled_by CHAR(36) COMMENT 'User ID who cancelled',
    completed_at TIMESTAMP(6) NULL,
    reminder_sent_24h BOOLEAN DEFAULT FALSE,
    reminder_sent_1h BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking_meeting (meeting_id),
    INDEX idx_booking_student (student_id),
    INDEX idx_booking_teacher (teacher_id),
    INDEX idx_booking_status (status),
    INDEX idx_booking_scheduled (scheduled_at),
    UNIQUE KEY unique_student_meeting (student_id, meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Classroom resources/materials
CREATE TABLE IF NOT EXISTS classroom_resources (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    classroom_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type ENUM('link', 'file', 'video', 'document') NOT NULL,
    resource_url VARCHAR(500) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE COMMENT 'Visible to non-members',
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_classroom_resources_classroom (classroom_id),
    INDEX idx_classroom_resources_type (resource_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Classroom announcements
CREATE TABLE IF NOT EXISTS classroom_announcements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    classroom_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_classroom_announcements_classroom (classroom_id),
    INDEX idx_classroom_announcements_pinned (is_pinned),
    INDEX idx_classroom_announcements_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MODULE 5: PAYMENT & CREDIT ENHANCEMENTS
-- ============================================

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    credits_amount INT NOT NULL COMMENT 'Amount in credits',
    status ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed') DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL COMMENT 'bank_transfer, paypal, etc.',
    payment_details JSON NOT NULL COMMENT 'Bank account, PayPal email, etc.',
    approved_by CHAR(36) COMMENT 'Admin user ID',
    approved_at TIMESTAMP(6) NULL,
    processed_at TIMESTAMP(6) NULL,
    rejection_reason TEXT,
    transaction_reference VARCHAR(255) COMMENT 'External payment reference',
    notes TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_withdrawal_user (user_id),
    INDEX idx_withdrawal_status (status),
    INDEX idx_withdrawal_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue shares (track how revenue is split)
CREATE TABLE IF NOT EXISTS revenue_shares (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    transaction_id CHAR(36) NOT NULL,
    meeting_id CHAR(36),
    teacher_id CHAR(36) NOT NULL,
    teacher_share DECIMAL(10, 2) NOT NULL COMMENT 'Amount to teacher (70%)',
    platform_share DECIMAL(10, 2) NOT NULL COMMENT 'Amount to platform (30%)',
    affiliate_id CHAR(36) COMMENT 'Referrer user ID',
    affiliate_share DECIMAL(10, 2) DEFAULT 0 COMMENT 'Affiliate commission (10% of total)',
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (transaction_id) REFERENCES credit_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (affiliate_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_revenue_share_transaction (transaction_id),
    INDEX idx_revenue_share_teacher (teacher_id),
    INDEX idx_revenue_share_affiliate (affiliate_id),
    INDEX idx_revenue_share_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment methods (stored payment methods for users)
CREATE TABLE IF NOT EXISTS payment_methods (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    provider ENUM('stripe', 'paypal', 'vnpay', 'bank_transfer') NOT NULL,
    provider_payment_method_id VARCHAR(255) COMMENT 'Stripe payment method ID, etc.',
    type VARCHAR(50) COMMENT 'card, bank_account, etc.',
    last4 VARCHAR(4) COMMENT 'Last 4 digits of card/account',
    brand VARCHAR(50) COMMENT 'visa, mastercard, etc.',
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_payment_methods_user (user_id),
    INDEX idx_payment_methods_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MODULE 6: MARKETPLACE (COMPLETELY NEW)
-- ============================================

-- Material categories
CREATE TABLE IF NOT EXISTS material_categories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id CHAR(36) COMMENT 'For nested categories',
    icon VARCHAR(100),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE SET NULL,
    INDEX idx_material_categories_parent (parent_id),
    INDEX idx_material_categories_slug (slug),
    INDEX idx_material_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Materials (教材/tài liệu)
CREATE TABLE IF NOT EXISTS materials (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id CHAR(36) NOT NULL,
    category_id CHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    material_type ENUM('pdf', 'video', 'slide', 'audio', 'document', 'course', 'ebook') NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INT COMMENT 'File size in bytes',
    preview_url VARCHAR(500) COMMENT 'Preview file URL (first pages/seconds)',
    thumbnail_url VARCHAR(500),
    price_credits INT NOT NULL DEFAULT 0,
    original_price_credits INT COMMENT 'For showing discounts',
    language VARCHAR(50),
    level ENUM('beginner', 'intermediate', 'advanced', 'all') DEFAULT 'all',
    tags JSON COMMENT 'Array of tags',
    duration INT COMMENT 'Duration in seconds (for video/audio)',
    page_count INT COMMENT 'Number of pages (for PDF/documents)',
    download_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    total_revenue INT DEFAULT 0 COMMENT 'Total credits earned',
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
    INDEX idx_materials_teacher (teacher_id),
    INDEX idx_materials_category (category_id),
    INDEX idx_materials_type (material_type),
    INDEX idx_materials_language (language),
    INDEX idx_materials_level (level),
    INDEX idx_materials_published (is_published),
    INDEX idx_materials_featured (is_featured),
    INDEX idx_materials_rating (rating DESC),
    INDEX idx_materials_sales (total_sales DESC),
    INDEX idx_materials_created (created_at DESC),
    FULLTEXT INDEX idx_materials_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Material purchases
CREATE TABLE IF NOT EXISTS material_purchases (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    material_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    price_paid INT NOT NULL COMMENT 'Credits paid at purchase time',
    transaction_id CHAR(36) COMMENT 'Reference to credit_transactions',
    download_count INT DEFAULT 0,
    last_downloaded_at TIMESTAMP(6) NULL,
    purchased_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES credit_transactions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_material (user_id, material_id),
    INDEX idx_material_purchases_material (material_id),
    INDEX idx_material_purchases_user (user_id),
    INDEX idx_material_purchases_date (purchased_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Material reviews
CREATE TABLE IF NOT EXISTS material_reviews (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    material_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE COMMENT 'User actually purchased this',
    helpful_count INT DEFAULT 0 COMMENT 'How many found this review helpful',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_material_review (user_id, material_id),
    INDEX idx_material_reviews_material (material_id),
    INDEX idx_material_reviews_user (user_id),
    INDEX idx_material_reviews_rating (rating),
    INDEX idx_material_reviews_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Material review helpfulness (who found review helpful)
CREATE TABLE IF NOT EXISTS material_review_helpful (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    review_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (review_id) REFERENCES material_reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_review_helpful (user_id, review_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADDITIONAL UTILITY TABLES
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'booking_reminder, payment_received, etc.',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON COMMENT 'Additional data for the notification',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP(6) NULL,
    action_url VARCHAR(500) COMMENT 'URL to navigate when clicked',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email queue (for async email sending)
CREATE TABLE IF NOT EXISTS email_queue (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template VARCHAR(100) COMMENT 'Email template name',
    template_data JSON COMMENT 'Data for template',
    status ENUM('pending', 'sending', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    INDEX idx_email_queue_status (status),
    INDEX idx_email_queue_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL COMMENT 'login, logout, join_meeting, etc.',
    entity_type VARCHAR(50) COMMENT 'meeting, material, etc.',
    entity_id CHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_action (action),
    INDEX idx_activity_logs_entity (entity_type, entity_id),
    INDEX idx_activity_logs_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample material categories
INSERT INTO material_categories (id, name, slug, description, display_order) VALUES
(UUID(), 'Grammar', 'grammar', 'Grammar lessons and exercises', 1),
(UUID(), 'Vocabulary', 'vocabulary', 'Vocabulary building materials', 2),
(UUID(), 'Pronunciation', 'pronunciation', 'Pronunciation guides and practice', 3),
(UUID(), 'Conversation', 'conversation', 'Conversation practice materials', 4),
(UUID(), 'Business English', 'business-english', 'Business English resources', 5),
(UUID(), 'Test Preparation', 'test-prep', 'TOEFL, IELTS, and other test prep', 6),
(UUID(), 'Culture', 'culture', 'Cultural learning materials', 7);

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Teacher earnings summary view
CREATE OR REPLACE VIEW teacher_earnings_summary AS
SELECT 
    u.id AS teacher_id,
    u.username AS teacher_name,
    COUNT(DISTINCT rs.id) AS total_transactions,
    SUM(rs.teacher_share) AS total_earnings,
    SUM(rs.total_amount) AS total_revenue_generated,
    AVG(rs.teacher_share) AS avg_earning_per_transaction,
    MAX(rs.created_at) AS last_earning_date
FROM users u
LEFT JOIN revenue_shares rs ON u.id = rs.teacher_id
WHERE u.role = 'teacher'
GROUP BY u.id, u.username;

-- Material sales summary view
CREATE OR REPLACE VIEW material_sales_summary AS
SELECT 
    m.id AS material_id,
    m.title,
    m.teacher_id,
    u.username AS teacher_name,
    m.price_credits,
    COUNT(mp.id) AS total_purchases,
    SUM(mp.price_paid) AS total_revenue,
    m.rating,
    m.total_reviews,
    m.created_at
FROM materials m
LEFT JOIN material_purchases mp ON m.id = mp.material_id
LEFT JOIN users u ON m.teacher_id = u.id
GROUP BY m.id, m.title, m.teacher_id, u.username, m.price_credits, m.rating, m.total_reviews, m.created_at;

-- Meeting statistics view
CREATE OR REPLACE VIEW meeting_statistics AS
SELECT 
    m.id AS meeting_id,
    m.title,
    m.meeting_type,
    m.host_id,
    u.username AS host_name,
    COUNT(DISTINCT mp.id) AS total_participants,
    m.total_participants AS all_time_participants,
    m.status,
    m.scheduled_at,
    m.started_at,
    m.ended_at,
    TIMESTAMPDIFF(MINUTE, m.started_at, m.ended_at) AS duration_minutes,
    COUNT(DISTINCT mcm.id) AS total_messages
FROM meetings m
LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_chat_messages mcm ON m.id = mcm.meeting_id
LEFT JOIN users u ON m.host_id = u.id
GROUP BY m.id, m.title, m.meeting_type, m.host_id, u.username, m.total_participants, 
         m.status, m.scheduled_at, m.started_at, m.ended_at;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'All missing tables created successfully!' AS Status;
SELECT 'Total tables created: 20+' AS Info;
SELECT 'Next steps: Run TypeORM entity generation or create entities manually' AS NextStep;
