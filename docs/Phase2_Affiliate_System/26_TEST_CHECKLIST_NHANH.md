# Phase 2 - Test Checklist Nhanh (Quick Reference)

**Dùng file này để track tiến độ test nhanh**

---

## 🚀 SETUP (5 phút)

- [ ] Backend đang chạy (`npm run start:dev`)
- [ ] Frontend đang chạy (`npm run dev`)
- [ ] Database migrations đã chạy
- [ ] Clear browser cookies/localStorage

---

## ✅ TEST 1: REFERRAL TRACKING (15 phút)

### Tạo Referrer
- [ ] Đăng ký user A (teacherA@test.com)
- [ ] Login và vào `/dashboard/affiliate`
- [ ] Copy referral link (vd: `?ref=ABC123`)

### Đăng ký Referred User
- [ ] Mở browser mới (Incognito)
- [ ] Truy cập referral link: `/register?ref=ABC123`
- [ ] Verify banner hiển thị referrer info
- [ ] Đăng ký user B (studentB@test.com)
- [ ] Verify database: `studentB.referrer_id = userA.id`

**SQL Check:**
```sql
SELECT u1.username as referrer, u2.username as referred 
FROM users u1 
JOIN users u2 ON u1.id = u2.referrer_id;
```

---

## 💰 TEST 2: REVENUE SHARING (30 phút)

### Setup
- [ ] Teacher A tạo lớp trả phí (100 credits)
- [ ] Student B nạp 200 credits
- [ ] Student C (organic, không referral) nạp 200 credits

### Test Affiliate Student (90/10)
- [ ] Student B book và join lớp
- [ ] Verify: Balance = 100 credits (đã trừ 100)
- [ ] Chờ meeting kết thúc + 30 phút
- [ ] Verify: Teacher A nhận 90 credits (affiliate bonus)
- [ ] Verify: Transaction type = AFFILIATE_BONUS

**SQL Check:**
```sql
-- Teacher earnings
SELECT * FROM credit_transactions 
WHERE user_id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
AND transaction_type = 'AFFILIATE_BONUS'
ORDER BY created_at DESC;
```

### Test Organic Student (70/30)
- [ ] Student C book và join lớp
- [ ] Verify: Balance = 100 credits
- [ ] Chờ meeting kết thúc + 30 phút
- [ ] Verify: Teacher A nhận 70 credits (credit transaction)
- [ ] Verify: Transaction type = CREDIT (không phải AFFILIATE_BONUS)

---

## 📊 TEST 3: DASHBOARD UI (10 phút)

- [ ] Login Teacher A
- [ ] Truy cập `/dashboard/affiliate`
- [ ] Verify stats:
  - [ ] Total Referrals = 1
  - [ ] Total Earnings > 0
  - [ ] This Month Earnings > 0
- [ ] Click "Copy Link" → Verify clipboard
- [ ] Tab "My Referrals" → Verify list hiển thị
- [ ] Tab "Earnings History" → Verify chart hiển thị

---

## ⏰ TEST 4: REVENUE SWEEPER (Optional - 30 phút)

- [ ] Tạo meeting đã kết thúc
- [ ] Verify: `payment_status = 'pending'`
- [ ] Chờ 30+ phút (hoặc check logs)
- [ ] Verify: `payment_status = 'completed'`
- [ ] Verify: Transactions được tạo tự động

**SQL Check:**
```sql
SELECT id, title, payment_status, payment_processed_at 
FROM meetings 
WHERE status = 'ENDED' 
AND payment_status = 'completed';
```

---

## 🔍 QUICK VERIFICATION SQL

### Check Referrals
```sql
SELECT 
    u1.username as referrer,
    COUNT(u2.id) as total_referrals
FROM users u1
LEFT JOIN users u2 ON u1.id = u2.referrer_id
WHERE u1.affiliate_code IS NOT NULL
GROUP BY u1.id, u1.username;
```

### Check Earnings
```sql
SELECT 
    u.username,
    SUM(CASE WHEN ct.transaction_type = 'AFFILIATE_BONUS' THEN ct.credit_amount ELSE 0 END) as affiliate_earnings,
    SUM(CASE WHEN ct.transaction_type = 'CREDIT' AND ct.credit_amount > 0 THEN ct.credit_amount ELSE 0 END) as organic_earnings
FROM users u
LEFT JOIN credit_transactions ct ON u.id = ct.user_id
WHERE ct.status = 'COMPLETED'
GROUP BY u.id, u.username;
```

### Check Payment Status
```sql
SELECT 
    m.id,
    m.title,
    m.payment_status,
    m.ended_at,
    TIMESTAMPDIFF(MINUTE, m.ended_at, NOW()) as minutes_ago
FROM meetings m
WHERE m.status = 'ENDED'
AND m.price_credits > 0
ORDER BY m.ended_at DESC;
```

---

## 🐛 TROUBLESHOOTING

### Referral không lưu?
- Check localStorage: `localStorage.getItem('affiliate_ref')`
- Check database: `SELECT referrer_id FROM users WHERE email = 'studentB@test.com'`

### Revenue không chia?
- Check meeting: `SELECT payment_status FROM meetings WHERE id = 'xxx'`
- Check transactions: `SELECT * FROM credit_transactions WHERE user_id = 'xxx'`
- Check logs: Backend console

### Dashboard không load?
- Check API: `/api/v1/affiliate/dashboard`
- Check JWT token valid
- Check browser console errors

---

## ⏱️ TỔNG THỜI GIAN

- **Setup:** 5 phút
- **Test 1:** 15 phút
- **Test 2:** 30 phút
- **Test 3:** 10 phút
- **Test 4:** 30 phút (optional)

**Total:** ~90 phút (1.5 giờ)

---

## ✅ PASS/FAIL

- [ ] **Test 1: PASS** / FAIL
- [ ] **Test 2: PASS** / FAIL
- [ ] **Test 3: PASS** / FAIL
- [ ] **Test 4: PASS** / FAIL (optional)

**Overall Status:** ✅ PASS / ❌ FAIL

---

**Chi tiết đầy đủ:** Xem `25_MANUAL_TESTING_GUIDE_CHI_TIET.md`

