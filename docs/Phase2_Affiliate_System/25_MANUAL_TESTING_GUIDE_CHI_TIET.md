# Phase 2 Affiliate System - Hướng Dẫn Test Thủ Công Chi Tiết

**Ngày:** 2025-01-03  
**Mục đích:** Hướng dẫn test từng bước cho người dùng thật

---

## 📋 MỤC LỤC

1. [Chuẩn Bị Môi Trường](#chuẩn-bị-môi-trường)
2. [Test Case 1: Referral Tracking - Đăng Ký Mới](#test-case-1-referral-tracking)
3. [Test Case 2: Revenue Sharing - Thanh Toán Lớp](#test-case-2-revenue-sharing)
4. [Test Case 3: Affiliate Dashboard](#test-case-3-affiliate-dashboard)
5. [Test Case 4: Revenue Sweeper Job](#test-case-4-revenue-sweeper-job)
6. [Test Case 5: Validate Affiliate Code](#test-case-5-validate-affiliate-code)
7. [Checklist Tổng Hợp](#checklist-tổng-hợp)

---

## 🔧 CHUẨN BỊ MÔI TRƯỜNG

### 1. Kiểm Tra Backend

```bash
cd talkplatform-backend

# 1. Check migrations đã chạy
npm run migration:show

# 2. Start backend server
npm run start:dev

# Verify: http://localhost:3000/api/v1/health
```

### 2. Kiểm Tra Frontend

```bash
cd talkplatform-frontend

# 1. Install dependencies (nếu chưa)
npm install

# 2. Start frontend server
npm run dev

# Verify: http://localhost:3001 (hoặc port được config)
```

### 3. Database Tools

- MySQL client hoặc phpMyAdmin để check database
- Hoặc dùng MySQL Workbench

### 4. Browser Tools

- Chrome/Firefox với DevTools mở
- Clear cookies/localStorage trước khi test
- Sử dụng Incognito mode cho mỗi user mới

---

## 📝 TEST CASE 1: REFERRAL TRACKING - ĐĂNG KÝ MỚI

### Mục đích: Test việc tracking referral code khi user đăng ký

### Bước 1: Tạo User Giới Thiệu (Referrer)

#### 1.1. Đăng ký User A (Teacher/Referrer)

1. **Mở trình duyệt (Incognito mode)**
2. **Truy cập:** `http://localhost:3001/register`
3. **Điền form:**
   ```
   Email: teacherA@test.com
   Username: teacherA
   Password: Test123!@#
   Confirm Password: Test123!@#
   ```
4. **Click "Create account"**
5. **Verify:**
   - ✅ Đăng ký thành công
   - ✅ Redirect đến `/login`

#### 1.2. Đăng nhập và lấy Affiliate Code

1. **Đăng nhập với:**
   ```
   Email: teacherA@test.com
   Password: Test123!@#
   ```
2. **Truy cập:** `http://localhost:3001/dashboard/affiliate`
3. **Verify:**
   - ✅ Dashboard hiển thị
   - ✅ Có referral link (vd: `http://localhost:3001/register?ref=ABC123`)
   - ✅ Copy referral link vào clipboard

#### 1.3. Verify Database

```sql
-- Check user A đã có affiliate_code
SELECT id, username, email, affiliate_code, referrer_id 
FROM users 
WHERE email = 'teacherA@test.com';

-- Expected:
-- id: [UUID]
-- username: teacherA
-- email: teacherA@test.com
-- affiliate_code: [Random code, e.g. ABC123]
-- referrer_id: NULL (vì là user đầu tiên)
```

---

### Bước 2: Đăng Ký User Được Giới Thiệu (Referred User)

#### 2.1. Đăng ký với Referral Link

1. **Mở trình duyệt mới (Incognito mode - khác với User A)**
2. **Truy cập referral link:**
   ```
   http://localhost:3001/register?ref=ABC123
   ```
   (Thay ABC123 bằng affiliate_code thực tế của teacherA)

3. **Verify UI:**
   - ✅ Hiển thị banner: "You are invited by teacherA"
   - ✅ Có avatar của referrer (nếu có)

4. **Mở DevTools (F12) → Application → Local Storage**
   - ✅ Check có key: `affiliate_ref` với value là referral code

5. **Điền form đăng ký:**
   ```
   Email: studentB@test.com
   Username: studentB
   Password: Test123!@#
   Confirm Password: Test123!@#
   ```

6. **Click "Create account"**

#### 2.2. Verify Referral Tracking trong Database

```sql
-- Check user B có referrer_id = user A's id
SELECT 
    u1.id as student_id,
    u1.username as student_username,
    u1.referrer_id,
    u2.id as referrer_id_check,
    u2.username as referrer_username,
    u2.affiliate_code as referrer_code
FROM users u1
LEFT JOIN users u2 ON u1.referrer_id = u2.id
WHERE u1.email = 'studentB@test.com';

-- Expected:
-- student_id: [UUID của studentB]
-- student_username: studentB
-- referrer_id: [UUID của teacherA] ✅
-- referrer_id_check: [UUID của teacherA] ✅
-- referrer_username: teacherA ✅
-- referrer_code: ABC123 ✅
```

#### 2.3. Test Referral Code trong URL Parameter

1. **Xóa localStorage** (DevTools → Application → Local Storage → Clear)
2. **Truy cập:** `http://localhost:3001/register?ref=ABC123`
3. **Verify:**
   - ✅ Banner hiển thị referrer info
   - ✅ LocalStorage được set lại với referral code
4. **Reload trang** (F5)
   - ✅ Referral code vẫn còn trong localStorage (persist)

#### 2.4. Test Invalid Referral Code

1. **Truy cập:** `http://localhost:3001/register?ref=INVALID_CODE`
2. **Verify:**
   - ✅ Không hiển thị banner
   - ✅ Hoặc hiển thị message "Invalid referral code"
3. **Đăng ký user mới:**
   ```
   Email: studentC@test.com
   Username: studentC
   Password: Test123!@#
   ```
4. **Verify Database:**
   ```sql
   SELECT referrer_id FROM users WHERE email = 'studentC@test.com';
   -- Expected: referrer_id = NULL ✅
   ```

---

## 💰 TEST CASE 2: REVENUE SHARING - THANH TOÁN LỚP

### Mục đích: Test revenue sharing khi học viên được giới thiệu tham gia lớp trả phí

### Bước 1: Chuẩn Bị

#### 1.1. Setup Teacher (Host)

1. **Đăng nhập với Teacher A** (teacherA@test.com)
2. **Tạo một lớp trả phí:**
   - Truy cập: `/meetings/create`
   - Điền thông tin:
     ```
     Title: Test Paid Class
     Price: 100 credits
     Duration: 60 minutes
     Date/Time: [Chọn thời gian trong tương lai]
     ```
   - Lưu lại `meeting_id` (từ URL hoặc response)

#### 1.2. Setup Student B (Được Giới Thiệu)

1. **Đăng nhập với Student B** (studentB@test.com)
   - Là học viên được giới thiệu bởi Teacher A
2. **Nạp credits:**
   - Truy cập: `/credits/purchase` hoặc `/wallet`
   - Nạp 200 credits
   - Verify: Balance = 200 credits

#### 1.3. Setup Student C (Tự Đến - Organic)

1. **Đăng ký user mới (không qua referral):**
   ```
   Email: studentC@test.com
   Username: studentC
   ```
2. **Nạp credits:**
   - Nạp 200 credits
   - Verify: Balance = 200 credits

---

### Bước 2: Student B Tham Gia Lớp (Affiliate Student)

#### 2.1. Book Class

1. **Đăng nhập với Student B**
2. **Tìm và book class của Teacher A:**
   - Truy cập: `/meetings/[meeting_id]`
   - Click "Book Now" hoặc "Join Class"
3. **Verify:**
   - ✅ Balance giảm: 200 → 100 credits (trừ 100 credits)
   - ✅ Được thêm vào participants

#### 2.2. Join và Hoàn Thành Class

1. **Chờ đến giờ lớp bắt đầu**
2. **Join lớp**
3. **Tham gia ít nhất 5 phút**
4. **End lớp** (hoặc để tự động end)

#### 2.3. Verify Revenue Sharing (Affiliate - 10% Platform, 90% Teacher)

**Wait 30+ minutes** để Revenue Sweeper Job chạy (hoặc trigger manual)

```sql
-- Check meeting payment status
SELECT 
    id,
    title,
    price_credits,
    payment_status,
    payment_processed_at,
    payment_metadata
FROM meetings
WHERE id = '[meeting_id]';

-- Expected:
-- payment_status: 'completed' ✅
-- payment_processed_at: [Timestamp] ✅
-- payment_metadata: JSON với transaction details ✅

-- Check transactions for Student B (paid)
SELECT 
    id,
    user_id,
    transaction_type,
    credit_amount,
    description,
    status,
    created_at
FROM credit_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'studentB@test.com')
ORDER BY created_at DESC
LIMIT 5;

-- Expected có transaction:
-- transaction_type: 'DEDUCTION'
-- credit_amount: -100 ✅
-- status: 'COMPLETED' ✅

-- Check transactions for Teacher A (earned)
SELECT 
    id,
    user_id,
    transaction_type,
    credit_amount,
    description,
    status
FROM credit_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
ORDER BY created_at DESC
LIMIT 5;

-- Expected có transaction:
-- transaction_type: 'AFFILIATE_BONUS' ✅
-- credit_amount: 90 (90% của 100 credits) ✅
-- description: Contains "Affiliate bonus" hoặc "Teacher referral" ✅
-- status: 'COMPLETED' ✅

-- Verify balances
SELECT 
    u.email,
    u.username,
    u.balance as current_balance
FROM users u
WHERE u.email IN ('studentB@test.com', 'teacherA@test.com');

-- Expected:
-- studentB: balance = 100 (200 - 100 paid)
-- teacherA: balance = 90 (0 + 90 earned) ✅
```

---

### Bước 3: Student C Tham Gia Lớp (Organic Student)

#### 3.1. Book Class

1. **Đăng nhập với Student C**
2. **Book cùng class của Teacher A** (hoặc tạo class mới)
3. **Verify:**
   - ✅ Balance giảm: 200 → 100 credits

#### 3.2. Verify Revenue Sharing (Organic - 30% Platform, 70% Teacher)

```sql
-- Check transactions for Teacher A (earned from organic student)
SELECT 
    id,
    transaction_type,
    credit_amount,
    description
FROM credit_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'teacherA@test.com')
AND transaction_type = 'CREDIT'
AND credit_amount > 0
ORDER BY created_at DESC
LIMIT 10;

-- Expected có transaction:
-- transaction_type: 'CREDIT' (không phải AFFILIATE_BONUS) ✅
-- credit_amount: 70 (70% của 100 credits) ✅
-- description: Contains "Meeting payment" hoặc "Class payment" ✅
```

---

## 📊 TEST CASE 3: AFFILIATE DASHBOARD

### Mục đích: Test UI và functionality của Affiliate Dashboard

### Bước 1: Truy Cập Dashboard

1. **Đăng nhập với Teacher A** (có referrals)
2. **Truy cập:** `http://localhost:3001/dashboard/affiliate`

### Bước 2: Verify Dashboard Stats

**Verify các thông tin hiển thị:**

1. **Referral Link Section:**
   - ✅ Hiển thị referral link đầy đủ
   - ✅ Có button "Copy Link"
   - ✅ Click copy → Verify clipboard có link
   - ✅ Message: "Share this link to earn 90% revenue..."

2. **Stats Cards:**
   - ✅ **Total Referrals:** Hiển thị số người đã giới thiệu
   - ✅ **Total Earnings:** Hiển thị tổng earnings từ referrals
   - ✅ **This Month:** Hiển thị earnings tháng này

### Bước 3: Test Referrals List Tab

1. **Click tab "My Referrals"**
2. **Verify:**
   - ✅ Table hiển thị danh sách referrals
   - ✅ Columns: User, Joined At, Status
   - ✅ Có pagination (nếu nhiều hơn 20 referrals)
3. **Check một referral:**
   - ✅ Avatar hiển thị
   - ✅ Username hiển thị
   - ✅ Date joined đúng format
   - ✅ Status = "active"

### Bước 4: Test Earnings History Tab

1. **Click tab "Earnings History"**
2. **Select period:**
   - Week (Last 7 Days)
   - Month (Last 12 Months)
   - Year (Last 5 Years)
3. **Verify:**
   - ✅ Chart hiển thị
   - ✅ Data points hiển thị đúng
   - ✅ X-axis labels format đúng theo period
   - ✅ Tooltip hiển thị khi hover

### Bước 5: Test API Directly (Optional)

**Open DevTools → Network tab:**

1. **GET `/api/v1/affiliate/dashboard`**
   - ✅ Status: 200
   - ✅ Response có structure:
     ```json
     {
       "total_referrals": 1,
       "total_earnings": 90,
       "this_month_earnings": 90,
       "referral_link": "http://localhost:3001/register?ref=ABC123",
       "recent_referrals": [...]
     }
     ```

2. **GET `/api/v1/affiliate/referrals?page=1&limit=20`**
   - ✅ Status: 200
   - ✅ Response có pagination

3. **GET `/api/v1/affiliate/earnings-history?period=month`**
   - ✅ Status: 200
   - ✅ Response là array với earnings grouped by date

---

## ⏰ TEST CASE 4: REVENUE SWEEPER JOB

### Mục đích: Test cron job tự động process revenue cho meetings đã kết thúc

### Bước 1: Setup Meeting

1. **Tạo meeting trả phí**
2. **Student tham gia và trả tiền**
3. **Meeting kết thúc**

### Bước 2: Verify Payment Status Before Sweeper

```sql
-- Check meeting payment status (should be PENDING)
SELECT 
    id,
    title,
    status,
    ended_at,
    payment_status,
    payment_processed_at
FROM meetings
WHERE id = '[meeting_id]'
AND status = 'ENDED'
AND ended_at < NOW();

-- Expected:
-- payment_status: 'pending' hoặc NULL ✅
-- payment_processed_at: NULL ✅
```

### Bước 3: Wait for Sweeper Job (hoặc Trigger Manual)

**Option 1: Wait 30+ minutes** (Job chạy mỗi 30 phút)

**Option 2: Trigger manual** (nếu có admin endpoint):
```bash
# Check backend logs
# Job sẽ chạy tự động sau 30 phút
```

### Bước 4: Verify Payment Status After Sweeper

```sql
-- Check meeting payment status (should be COMPLETED)
SELECT 
    id,
    title,
    payment_status,
    payment_processed_at,
    payment_metadata
FROM meetings
WHERE id = '[meeting_id]';

-- Expected:
-- payment_status: 'completed' ✅
-- payment_processed_at: [Timestamp sau khi ended_at + 30 mins] ✅
-- payment_metadata: JSON với transaction results ✅

-- Check transactions were created
SELECT 
    ct.*
FROM credit_transactions ct
WHERE ct.description LIKE '%[meeting_title]%'
OR ct.created_at > (SELECT ended_at FROM meetings WHERE id = '[meeting_id]')
ORDER BY ct.created_at DESC;

-- Expected có transactions:
-- 1. Student deduction (paid)
-- 2. Teacher earning (affiliate bonus hoặc credit)
```

### Bước 5: Check Backend Logs

```bash
# Check backend console logs
# Should see:
# [RevenueSweeperJob] Starting revenue sweeper job...
# [RevenueSweeperJob] Found X unprocessed meetings
# [RevenueSweeperJob] Processing revenue for meeting [id]...
# [RevenueSweeperJob] Finished processing meeting [id]. Status: completed
```

---

## ✅ TEST CASE 5: VALIDATE AFFILIATE CODE

### Mục đích: Test API validate affiliate code

### Bước 1: Test Valid Code

**Using Postman hoặc curl:**

```bash
curl -X GET "http://localhost:3000/api/v1/affiliate/validate/ABC123" \
  -H "Authorization: Bearer [JWT_TOKEN]"
```

**Expected Response:**
```json
{
  "valid": true,
  "referrer_name": "teacherA",
  "referrer_avatar": "http://..."
}
```

### Bước 2: Test Invalid Code

```bash
curl -X GET "http://localhost:3000/api/v1/affiliate/validate/INVALID" \
  -H "Authorization: Bearer [JWT_TOKEN]"
```

**Expected Response:**
```json
{
  "valid": false
}
```

### Bước 3: Test Empty Code

```bash
curl -X GET "http://localhost:3000/api/v1/affiliate/validate/" \
  -H "Authorization: Bearer [JWT_TOKEN]"
```

**Expected Response:**
```json
{
  "valid": false,
  "message": "Affiliate code is required"
}
```

---

## 📋 CHECKLIST TỔNG HỢP

### ✅ Referral Tracking

- [ ] User có thể đăng ký với referral link
- [ ] Referral code được lưu vào localStorage
- [ ] Referral code persist sau khi reload
- [ ] Database lưu đúng referrer_id
- [ ] Invalid referral code không được lưu
- [ ] Banner hiển thị referrer info khi đăng ký

### ✅ Revenue Sharing

- [ ] Affiliate student trả tiền → Platform lấy 10%, Teacher 90%
- [ ] Organic student trả tiền → Platform lấy 30%, Teacher 70%
- [ ] Transaction types đúng (AFFILIATE_BONUS vs CREDIT)
- [ ] Balances được update đúng
- [ ] Payment status tracking hoạt động

### ✅ Dashboard UI

- [ ] Dashboard load được
- [ ] Stats hiển thị đúng
- [ ] Referral link copy được
- [ ] Referrals list hiển thị đúng
- [ ] Earnings history chart hiển thị
- [ ] Pagination hoạt động

### ✅ Revenue Sweeper Job

- [ ] Job chạy sau 30 phút
- [ ] Payment status được update
- [ ] Transactions được tạo
- [ ] Logs hiển thị đúng

### ✅ API Endpoints

- [ ] `/affiliate/dashboard` - 200 OK
- [ ] `/affiliate/referrals` - 200 OK
- [ ] `/affiliate/earnings-history` - 200 OK
- [ ] `/affiliate/validate/:code` - 200 OK
- [ ] Old endpoints vẫn hoạt động (backward compatible)

### ✅ Edge Cases

- [ ] Free classes (0 credits) không tính revenue
- [ ] Meeting không có participants → payment status = completed (no revenue)
- [ ] Multiple referrals cùng lúc
- [ ] Referrer không tồn tại → error handling

---

## 🔍 DEBUGGING TIPS

### 1. Check Database

```sql
-- Check all referrals
SELECT 
    u1.username as referrer,
    u2.username as referred,
    u2.created_at as referred_date
FROM users u1
JOIN users u2 ON u1.id = u2.referrer_id
ORDER BY u2.created_at DESC;

-- Check revenue transactions
SELECT 
    u.username,
    ct.transaction_type,
    ct.credit_amount,
    ct.description,
    ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.transaction_type IN ('AFFILIATE_BONUS', 'CREDIT', 'DEDUCTION')
ORDER BY ct.created_at DESC
LIMIT 50;

-- Check meeting payment status
SELECT 
    m.id,
    m.title,
    m.price_credits,
    m.status,
    m.payment_status,
    m.ended_at,
    TIMESTAMPDIFF(MINUTE, m.ended_at, NOW()) as minutes_since_ended
FROM meetings m
WHERE m.price_credits > 0
AND m.status = 'ENDED'
ORDER BY m.ended_at DESC;
```

### 2. Check Backend Logs

```bash
# Look for:
# - RevenueSweeperJob logs
# - Transaction creation logs
# - Error logs
```

### 3. Check Frontend Console

```javascript
// Open DevTools Console
// Check for:
// - API errors
// - Network requests
// - localStorage values
localStorage.getItem('affiliate_ref')
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi test xong, bạn nên có:

1. ✅ **3-4 users đã đăng ký:**
   - 1 teacher (referrer)
   - 2-3 students (1 được giới thiệu, 1-2 organic)

2. ✅ **2-3 meetings đã hoàn thành:**
   - 1 với affiliate student (90/10 split)
   - 1 với organic student (70/30 split)

3. ✅ **Transactions trong database:**
   - Student deductions
   - Teacher earnings (affiliate bonus + credits)

4. ✅ **Dashboard hiển thị đúng:**
   - Total referrals count
   - Total earnings
   - Earnings history chart

---

**Chúc bạn test thành công!** 🚀

Nếu gặp vấn đề, check logs và database queries ở trên để debug.

