# Phase 2 - Testing Documentation Index

**Tất cả tài liệu liên quan đến testing**

---

## 📚 TESTING DOCUMENTS

### 1. **25_MANUAL_TESTING_GUIDE_CHI_TIET.md** ⭐ RECOMMENDED
**Hướng dẫn test chi tiết từng bước**

- ✅ Chuẩn bị môi trường
- ✅ Test Case 1: Referral Tracking (đăng ký mới)
- ✅ Test Case 2: Revenue Sharing (thanh toán lớp)
- ✅ Test Case 3: Affiliate Dashboard (UI)
- ✅ Test Case 4: Revenue Sweeper Job (cron)
- ✅ Test Case 5: Validate Affiliate Code (API)
- ✅ Checklist tổng hợp
- ✅ Debugging tips

**Dùng khi:** Muốn test đầy đủ từ đầu đến cuối

---

### 2. **26_TEST_CHECKLIST_NHANH.md** 🚀 QUICK REFERENCE
**Checklist nhanh để track tiến độ**

- ✅ Setup (5 phút)
- ✅ Test 1: Referral Tracking (15 phút)
- ✅ Test 2: Revenue Sharing (30 phút)
- ✅ Test 3: Dashboard UI (10 phút)
- ✅ Test 4: Revenue Sweeper (30 phút)
- ✅ Quick verification SQL
- ✅ Troubleshooting

**Dùng khi:** Đã biết cách test, chỉ cần checklist

---

### 3. **27_TEST_SCRIPTS_SQL.md** 💻 SQL QUERIES
**SQL queries để verify test results**

- ✅ Referral tracking queries
- ✅ Revenue sharing queries
- ✅ Meeting payment status queries
- ✅ Affiliate stats queries
- ✅ Validation queries
- ✅ Debug queries
- ✅ Cleanup queries (test only)

**Dùng khi:** Cần verify database hoặc debug

---

## 🎯 BẮT ĐẦU TEST NHƯ THẾ NÀO?

### Option 1: Test Đầy Đủ (Lần Đầu) ⭐

1. **Đọc:** `25_MANUAL_TESTING_GUIDE_CHI_TIET.md`
2. **Làm theo:** Từng bước trong guide
3. **Verify:** Dùng SQL queries từ `27_TEST_SCRIPTS_SQL.md`
4. **Track:** Check off trong `26_TEST_CHECKLIST_NHANH.md`

**Thời gian:** ~1.5 giờ

---

### Option 2: Test Nhanh (Đã Biết Cách)

1. **Mở:** `26_TEST_CHECKLIST_NHANH.md`
2. **Follow:** Checklist từng test case
3. **Verify:** Copy-paste SQL queries từ `27_TEST_SCRIPTS_SQL.md`

**Thời gian:** ~1 giờ

---

### Option 3: Chỉ Verify Database

1. **Mở:** `27_TEST_SCRIPTS_SQL.md`
2. **Copy-paste:** SQL queries vào MySQL client
3. **Verify:** Results match expected

**Thời gian:** ~15 phút

---

## 📋 TEST FLOW SUMMARY

```
1. Setup Environment
   ↓
2. Create Referrer User (Teacher A)
   ↓
3. Register Referred User (Student B via link)
   ↓
4. Verify Referral Tracking in DB
   ↓
5. Create Paid Meeting
   ↓
6. Student B Books & Joins
   ↓
7. Verify Revenue Sharing (90/10)
   ↓
8. Register Organic User (Student C)
   ↓
9. Student C Books & Joins
   ↓
10. Verify Revenue Sharing (70/30)
   ↓
11. Test Dashboard UI
   ↓
12. Verify Revenue Sweeper Job
```

---

## 🔍 QUICK REFERENCE

### Test Users

```
Teacher A (Referrer):
  Email: teacherA@test.com
  Username: teacherA
  Affiliate Code: ABC123 (example)

Student B (Referred):
  Email: studentB@test.com
  Username: studentB
  Referrer: Teacher A

Student C (Organic):
  Email: studentC@test.com
  Username: studentC
  Referrer: NULL
```

### Expected Results

```
Affiliate Student (B):
  Platform: 10 credits (10%)
  Teacher: 90 credits (90%)

Organic Student (C):
  Platform: 30 credits (30%)
  Teacher: 70 credits (70%)
```

### Key URLs

```
Dashboard: http://localhost:3001/dashboard/affiliate
Register: http://localhost:3001/register?ref=ABC123
API Base: http://localhost:3000/api/v1
```

---

## ✅ VERIFICATION CHECKLIST

### Quick Checks

- [ ] Backend running: `http://localhost:3000/api/v1/health`
- [ ] Frontend running: `http://localhost:3001`
- [ ] Database accessible
- [ ] Migrations executed

### After Test

- [ ] Referrals tracked in database
- [ ] Revenue sharing calculated correctly
- [ ] Dashboard shows correct stats
- [ ] Transactions created properly
- [ ] Payment status updated

---

## 🐛 TROUBLESHOOTING GUIDE

### Problem: Referral không lưu
**Solution:** Check `25_MANUAL_TESTING_GUIDE_CHI_TIET.md` → Test Case 1 → Bước 2.2

### Problem: Revenue không chia
**Solution:** Check `25_MANUAL_TESTING_GUIDE_CHI_TIET.md` → Test Case 2 → Bước 2.3 + SQL queries

### Problem: Dashboard không load
**Solution:** Check `25_MANUAL_TESTING_GUIDE_CHI_TIET.md` → Test Case 3 → Bước 5 (API Direct)

### Problem: Cần verify database
**Solution:** Use `27_TEST_SCRIPTS_SQL.md` → Copy relevant query

---

## 📊 TEST RESULTS TEMPLATE

```
Date: ___________
Tester: ___________

Test 1: Referral Tracking
  Status: ✅ PASS / ❌ FAIL
  Notes: ___________

Test 2: Revenue Sharing
  Status: ✅ PASS / ❌ FAIL
  Notes: ___________

Test 3: Dashboard UI
  Status: ✅ PASS / ❌ FAIL
  Notes: ___________

Test 4: Revenue Sweeper
  Status: ✅ PASS / ❌ FAIL
  Notes: ___________

Overall: ✅ PASS / ❌ FAIL
```

---

## 🎯 NEXT STEPS AFTER TESTING

1. **Nếu tất cả PASS:**
   - ✅ Ready for deployment
   - ✅ Document any issues found
   - ✅ Update production checklist

2. **Nếu có FAIL:**
   - ❌ Document issue details
   - ❌ Check logs và database
   - ❌ Create bug report
   - ❌ Fix và re-test

---

**Happy Testing!** 🚀

**Recommended Starting Point:** `25_MANUAL_TESTING_GUIDE_CHI_TIET.md`

