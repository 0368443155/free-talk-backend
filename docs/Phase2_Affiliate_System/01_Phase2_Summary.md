# PHASE 2: AFFILIATE SYSTEM - TỔNG QUAN

**Ngày tạo:** 03/12/2025  
**Thời gian thực hiện:** 2 tuần (Week 3-4)  
**Độ ưu tiên:** 🟡 HIGH

---

## 🎯 MỤC TIÊU PHASE 2

Xây dựng hệ thống affiliate để track nguồn học viên và chia sẻ doanh thu công bằng:

1. ✅ Track user đăng ký qua affiliate link
2. ✅ Mapping nguồn học viên (platform vs teacher referral)
3. ✅ Auto revenue sharing khi kết thúc lớp
4. ✅ Dashboard hiển thị referral stats

---

## 📊 HIỆN TRẠNG

### ✅ Đã có (60%)
- `affiliate_code` field trong User, TeacherProfile, Meeting, Course
- Auto generate affiliate code khi duyệt teacher
- Revenue sharing logic cơ bản

### ❌ Còn thiếu (40%)
- Field `referred_by` trong User entity
- Logic track `?ref=CODE` khi register
- Trigger revenue sharing khi end class
- UI dashboard hiển thị referral stats
- Referral link generator

---

## 🗓️ TIMELINE

### **Week 3: Referral Tracking**
- **Day 1-2:** Add `referred_by` field + migration
- **Day 3-4:** Track referral code khi register
- **Day 5:** Referral dashboard UI

### **Week 4: Revenue Sharing**
- **Day 1-2:** Auto trigger revenue sharing
- **Day 3-4:** Revenue logs & analytics
- **Day 5:** Testing & optimization

---

## 📋 DELIVERABLES

### Backend
1. ✅ Migration: Add `referred_by` field
2. ✅ Auth service: Track ref code
3. ✅ Revenue sharing: Auto trigger
4. ✅ API: Referral stats

### Frontend
1. ✅ Referral link generator
2. ✅ Referral dashboard
3. ✅ Revenue breakdown UI
4. ✅ Analytics charts

### Database
1. ✅ `referred_by` field in users
2. ✅ `revenue_logs` table
3. ✅ Indexes for performance

---

## 📁 CẤU TRÚC TÀI LIỆU PHASE 2

```
Phase2_Affiliate_System/
├── 01_Phase2_Summary.md                (File này)
├── 02_Referral_Tracking.md            (Track đăng ký)
├── 03_Revenue_Sharing.md              (Chia doanh thu)
├── 04_Referral_Dashboard.md           (Dashboard UI)
├── 05_Analytics.md                    (Phân tích dữ liệu)
└── 06_Testing_Guide.md                (Hướng dẫn test)
```

---

## 💰 REVENUE SHARING POLICY

### Platform Source (Student tự đăng ký)
- **Platform:** 30%
- **Teacher:** 70%

### Teacher Referral (Student đăng ký qua ref link của teacher)
- **Platform:** 10%
- **Teacher:** 90%

---

## 🎯 SUCCESS CRITERIA

- [ ] Referral link hoạt động chính xác
- [ ] Revenue sharing tự động khi end class
- [ ] Dashboard hiển thị đúng stats
- [ ] 100% transactions được log

---

**Next:** `02_Referral_Tracking.md`
