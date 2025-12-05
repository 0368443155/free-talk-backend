# Phase 2 - SQL Test Scripts (Quick Copy-Paste)

**Các SQL queries để verify test results nhanh chóng**

---

## 👥 REFERRAL TRACKING QUERIES

### 1. Check All Referrals

```sql
-- List tất cả referrals với thông tin referrer
SELECT 
    u1.id as referrer_id,
    u1.username as referrer_username,
    u1.email as referrer_email,
    u1.affiliate_code as referrer_code,
    u2.id as referred_id,
    u2.username as referred_username,
    u2.email as referred_email,
    u2.created_at as referred_date
FROM users u1
LEFT JOIN users u2 ON u1.id = u2.referrer_id
WHERE u1.affiliate_code IS NOT NULL
ORDER BY u2.created_at DESC;
```

### 2. Check Specific User's Referrals

```sql
-- Thay 'teacherA' bằng username thực tế
SELECT 
    u2.id,
    u2.username,
    u2.email,
    u2.created_at as joined_date,
    u2.balance as current_balance
FROM users u1
JOIN users u2 ON u1.id = u2.referrer_id
WHERE u1.username = 'teacherA'
ORDER BY u2.created_at DESC;
```

### 3. Count Referrals by User

```sql
-- Số lượng referrals của mỗi user
SELECT 
    u1.username as referrer,
    u1.affiliate_code,
    COUNT(u2.id) as total_referrals,
    MAX(u2.created_at) as latest_referral
FROM users u1
LEFT JOIN users u2 ON u1.id = u2.referrer_id
WHERE u1.affiliate_code IS NOT NULL
GROUP BY u1.id, u1.username, u1.affiliate_code
ORDER BY total_referrals DESC;
```

---

## 💰 REVENUE SHARING QUERIES

### 4. Check Affiliate Earnings (90/10 Split)

```sql
-- Earnings từ affiliate students (AFFILIATE_BONUS)
SELECT 
    u.username,
    u.email,
    ct.transaction_type,
    ct.credit_amount,
    ct.description,
    ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.transaction_type = 'AFFILIATE_BONUS'
AND ct.status = 'COMPLETED'
ORDER BY ct.created_at DESC
LIMIT 20;
```

### 5. Check Organic Earnings (70/30 Split)

```sql
-- Earnings từ organic students (CREDIT transaction)
SELECT 
    u.username,
    u.email,
    ct.transaction_type,
    ct.credit_amount,
    ct.description,
    ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.transaction_type = 'CREDIT'
AND ct.credit_amount > 0
AND ct.status = 'COMPLETED'
AND ct.description LIKE '%Meeting%' OR ct.description LIKE '%Class%'
ORDER BY ct.created_at DESC
LIMIT 20;
```

### 6. Total Earnings Summary

```sql
-- Tổng earnings của một teacher
SELECT 
    u.username,
    u.email,
    SUM(CASE 
        WHEN ct.transaction_type = 'AFFILIATE_BONUS' 
        THEN ct.credit_amount 
        ELSE 0 
    END) as affiliate_earnings,
    SUM(CASE 
        WHEN ct.transaction_type = 'CREDIT' AND ct.credit_amount > 0 
        THEN ct.credit_amount 
        ELSE 0 
    END) as organic_earnings,
    u.balance as current_balance
FROM users u
LEFT JOIN credit_transactions ct ON u.id = ct.user_id
WHERE u.id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
AND (ct.status = 'COMPLETED' OR ct.status IS NULL)
GROUP BY u.id, u.username, u.email, u.balance;
```

### 7. Student Payment History

```sql
-- Lịch sử thanh toán của student
SELECT 
    ct.transaction_type,
    ct.credit_amount,
    ct.description,
    ct.status,
    ct.created_at
FROM credit_transactions ct
WHERE ct.user_id = (SELECT id FROM users WHERE email = 'studentB@test.com')
ORDER BY ct.created_at DESC;
```

---

## 📊 MEETING PAYMENT STATUS QUERIES

### 8. Check Meeting Payment Status

```sql
-- Check payment status của meetings
SELECT 
    m.id,
    m.title,
    m.price_credits,
    m.status as meeting_status,
    m.payment_status,
    m.ended_at,
    TIMESTAMPDIFF(MINUTE, m.ended_at, NOW()) as minutes_since_ended,
    m.payment_processed_at,
    JSON_PRETTY(m.payment_metadata) as payment_metadata
FROM meetings m
WHERE m.price_credits > 0
ORDER BY m.ended_at DESC
LIMIT 10;
```

### 9. Unprocessed Meetings (PENDING)

```sql
-- Meetings chưa được process (sẽ được sweeper job xử lý)
SELECT 
    m.id,
    m.title,
    m.price_credits,
    m.status,
    m.payment_status,
    m.ended_at,
    TIMESTAMPDIFF(MINUTE, m.ended_at, NOW()) as minutes_ago
FROM meetings m
WHERE m.status = 'ENDED'
AND m.price_credits > 0
AND (m.payment_status = 'pending' OR m.payment_status IS NULL)
AND m.ended_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
ORDER BY m.ended_at ASC;
```

### 10. Processed Meetings (COMPLETED)

```sql
-- Meetings đã được process thành công
SELECT 
    m.id,
    m.title,
    m.price_credits,
    m.payment_status,
    m.payment_processed_at,
    JSON_EXTRACT(m.payment_metadata, '$.success_count') as success_count,
    JSON_EXTRACT(m.payment_metadata, '$.failure_count') as failure_count
FROM meetings m
WHERE m.payment_status = 'completed'
ORDER BY m.payment_processed_at DESC
LIMIT 10;
```

---

## 📈 AFFILIATE STATS QUERIES

### 11. Dashboard Stats (Manual Calculation)

```sql
-- Tính stats như dashboard API
SELECT 
    u.id,
    u.username,
    u.affiliate_code,
    -- Total referrals
    (SELECT COUNT(*) 
     FROM users u2 
     WHERE u2.referrer_id = u.id) as total_referrals,
    -- Total earnings (AFFILIATE_BONUS only)
    COALESCE((SELECT SUM(ct.credit_amount)
              FROM credit_transactions ct
              WHERE ct.user_id = u.id
              AND ct.transaction_type = 'AFFILIATE_BONUS'
              AND ct.status = 'COMPLETED'), 0) as total_earnings,
    -- This month earnings
    COALESCE((SELECT SUM(ct.credit_amount)
              FROM credit_transactions ct
              WHERE ct.user_id = u.id
              AND ct.transaction_type = 'AFFILIATE_BONUS'
              AND ct.status = 'COMPLETED'
              AND MONTH(ct.created_at) = MONTH(NOW())
              AND YEAR(ct.created_at) = YEAR(NOW())), 0) as this_month_earnings,
    -- Current balance
    u.balance as current_balance
FROM users u
WHERE u.id = (SELECT id FROM users WHERE email = 'teacherA@test.com');
```

### 12. Earnings History by Date

```sql
-- Earnings grouped by date (cho chart)
SELECT 
    DATE(ct.created_at) as date,
    SUM(ct.credit_amount) as daily_earnings,
    COUNT(*) as transaction_count
FROM credit_transactions ct
WHERE ct.user_id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
AND ct.transaction_type = 'AFFILIATE_BONUS'
AND ct.status = 'COMPLETED'
AND ct.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(ct.created_at)
ORDER BY date DESC;
```

### 13. Recent Referrals with Spending

```sql
-- Referrals với tổng số tiền đã chi
SELECT 
    u2.id,
    u2.username,
    u2.email,
    u2.created_at as joined_date,
    COALESCE(SUM(CASE 
        WHEN ct.transaction_type IN ('DEDUCTION', 'PURCHASE')
        THEN ABS(ct.credit_amount)
        ELSE 0
    END), 0) as total_spent,
    CASE 
        WHEN MAX(ct.created_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        THEN 'active'
        ELSE 'inactive'
    END as status
FROM users u1
JOIN users u2 ON u1.id = u2.referrer_id
LEFT JOIN credit_transactions ct ON u2.id = ct.user_id
WHERE u1.id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
GROUP BY u2.id, u2.username, u2.email, u2.created_at
ORDER BY u2.created_at DESC
LIMIT 20;
```

---

## 🔍 VALIDATION QUERIES

### 14. Validate Affiliate Code

```sql
-- Check affiliate code có tồn tại không
SELECT 
    id,
    username,
    email,
    affiliate_code,
    avatar_url
FROM users
WHERE affiliate_code = 'ABC123';  -- Thay bằng code thực tế
```

### 15. Check User Balance After Transaction

```sql
-- Verify balance sau khi transaction
SELECT 
    u.username,
    u.email,
    u.balance,
    (
        SELECT SUM(credit_amount)
        FROM credit_transactions
        WHERE user_id = u.id
        AND status = 'COMPLETED'
    ) as calculated_balance,
    u.balance - (
        SELECT SUM(credit_amount)
        FROM credit_transactions
        WHERE user_id = u.id
        AND status = 'COMPLETED'
    ) as difference
FROM users u
WHERE u.email IN ('teacherA@test.com', 'studentB@test.com', 'studentC@test.com');
```

---

## 🐛 DEBUG QUERIES

### 16. Check All Transactions for User

```sql
-- Tất cả transactions của một user
SELECT 
    ct.id,
    ct.transaction_type,
    ct.credit_amount,
    ct.description,
    ct.status,
    ct.created_at
FROM credit_transactions ct
WHERE ct.user_id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
ORDER BY ct.created_at DESC;
```

### 17. Check Meeting Participants

```sql
-- Participants của một meeting
SELECT 
    mp.user_id,
    u.username,
    u.email,
    mp.duration_seconds,
    mp.joined_at,
    mp.left_at,
    m.price_credits,
    m.payment_status
FROM meeting_participants mp
JOIN users u ON mp.user_id = u.id
JOIN meetings m ON mp.meeting_id = m.id
WHERE mp.meeting_id = 'MEETING_ID_HERE'  -- Thay bằng meeting_id thực tế
AND mp.user_id != m.host_id;  -- Exclude host
```

### 18. Revenue Sharing Calculation Check

```sql
-- Verify revenue sharing calculation cho một meeting
SELECT 
    m.id,
    m.title,
    m.price_credits,
    m.payment_status,
    -- Platform fee (10% affiliate, 30% organic)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM users u
            JOIN meeting_participants mp ON u.id = mp.user_id
            WHERE mp.meeting_id = m.id
            AND u.referrer_id = m.host_id
        )
        THEN m.price_credits * 0.10  -- 10% for affiliate
        ELSE m.price_credits * 0.30  -- 30% for organic
    END as platform_fee,
    -- Teacher earning
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM users u
            JOIN meeting_participants mp ON u.id = mp.user_id
            WHERE mp.meeting_id = m.id
            AND u.referrer_id = m.host_id
        )
        THEN m.price_credits * 0.90  -- 90% for affiliate
        ELSE m.price_credits * 0.70  -- 70% for organic
    END as teacher_earning
FROM meetings m
WHERE m.id = 'MEETING_ID_HERE';
```

---

## 📋 CLEANUP QUERIES (Optional - Test Data Only)

### 19. Delete Test Users (CAREFUL!)

```sql
-- ⚠️ CHỈ DÙNG TRONG MÔI TRƯỜNG TEST!
-- Delete test users và related data
DELETE FROM credit_transactions 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com'
);

DELETE FROM meeting_participants
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%@test.com'
);

DELETE FROM users 
WHERE email LIKE '%@test.com';
```

---

## 💡 USAGE TIPS

1. **Copy-Paste:** Copy query vào MySQL client hoặc phpMyAdmin
2. **Replace Values:** Thay `teacherA@test.com`, `ABC123`, `MEETING_ID_HERE` bằng giá trị thực tế
3. **Test Environment Only:** Queries 1-18 safe, query 19 là DELETE (cẩn thận!)

---

**Happy Testing!** 🚀

