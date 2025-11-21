-- ============================================
-- CREATE CREDIT_TRANSACTIONS TABLE
-- This table is required by other tables
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    transaction_type ENUM('purchase', 'deduction', 'refund', 'bonus', 'affiliate_earning', 'withdrawal') NOT NULL,
    amount INT NOT NULL COMMENT 'Positive for credit, negative for debit',
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    description VARCHAR(500),
    reference_type VARCHAR(50) COMMENT 'meeting, material, package, etc.',
    reference_id CHAR(36) COMMENT 'ID of related entity',
    payment_method VARCHAR(50) COMMENT 'stripe, paypal, vnpay, etc.',
    payment_reference VARCHAR(255) COMMENT 'External payment ID',
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    metadata JSON COMMENT 'Additional transaction data',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_credit_transactions_user (user_id),
    INDEX idx_credit_transactions_type (transaction_type),
    INDEX idx_credit_transactions_status (status),
    INDEX idx_credit_transactions_reference (reference_type, reference_id),
    INDEX idx_credit_transactions_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'credit_transactions table created successfully!' AS Status;
