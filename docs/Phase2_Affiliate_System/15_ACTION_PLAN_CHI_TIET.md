# PHASE 2 - ACTION PLAN CHI TIẾT

**Ngày tạo:** 03/12/2025  
**Mục đích:** Kế hoạch hành động chi tiết dựa trên đánh giá  
**Trạng thái:** ✅ Ready for Execution

---

## 📋 TỔNG QUAN

Dựa trên đánh giá tổng quan về chất lượng tài liệu, đây là action plan chi tiết để hoàn thiện Phase 2 Affiliate System.

---

## 🔴 PHASE 1: HOTFIX (Ngay lập tức - Hôm nay)

### Task 1.1: Fix Revenue Sharing Logic ⚠️ CRITICAL

**Thời gian:** 30 phút  
**Priority:** 🔴 CRITICAL

#### Steps

1. **Mở file:**
   ```
   talkplatform-backend/src/features/credits/credits.service.ts
   ```

2. **Tìm dòng 287:**
   ```typescript
   const platformPercentage = isAffiliateStudent ? 30 : 70;
   ```

3. **Thay thế bằng:**
   ```typescript
   // Platform fee percentage (10% for referral, 30% for organic)
   const platformFeePercentage = isAffiliateStudent ? 10 : 30;
   const teacherPercentage = 100 - platformFeePercentage;
   
   const platformFee = (meeting.price_credits * platformFeePercentage) / 100;
   const teacherEarning = meeting.price_credits - platformFee;
   ```

4. **Cập nhật các dòng liên quan:**
   - Line 306: `platform_fee_percentage: platformFeePercentage,`
   - Line 326: `platform_fee_percentage: platformFeePercentage,`
   - Line 353: `revenue_share: \`${platformFeePercentage}% platform / ${teacherPercentage}% teacher\``

#### Verification

- [ ] Code compiles without errors
- [ ] Logic matches policy: 10% affiliate, 30% organic
- [ ] Review by senior developer

**Tài liệu tham khảo:**
- `09_CRITICAL_ISSUES_AND_FIXES.md` - Quick Fix Guide

---

### Task 1.2: Write Unit Tests cho Revenue Logic

**Thời gian:** 3 giờ  
**Priority:** 🔴 CRITICAL (Prevent regression)

#### Steps

1. **Tạo test file:**
   ```
   talkplatform-backend/src/features/credits/credits.service.spec.ts
   ```

2. **Implement test cases:**
   - Organic student: 30% platform, 70% teacher
   - Affiliate student: 10% platform, 90% teacher
   - Edge cases: 0 credits, high value, rounding
   - Error cases: insufficient balance

3. **Run tests:**
   ```bash
   npm test -- credits.service.spec.ts
   npm run test:cov -- credits.service.spec.ts
   ```

#### Test Coverage Requirements

- [ ] Revenue sharing logic: 100% coverage
- [ ] isAffiliateStudent: 100% coverage
- [ ] Edge cases: All covered
- [ ] Error handling: All paths covered

**Tài liệu tham khảo:**
- `13_UNIT_TEST_REVENUE_SHARING.md` - Complete test specification

---

## 🟠 PHASE 2: HIGH PRIORITY (Tuần này)

### Task 2.1: Database Migration - Fix Typo

**Thời gian:** 2 giờ  
**Priority:** 🟠 HIGH

#### Steps

1. **Tạo migration file:**
   ```bash
   cd talkplatform-backend
   npm run migration:create src/database/migrations/FixReferrerColumn
   ```

2. **Implement migration:**
   - Rename column: `refferrer_id` → `referrer_id`
   - Change type: `char(36)` → `uuid`
   - Add foreign key constraint
   - Create index

3. **Update User entity:**
   ```typescript
   @Column({ type: 'uuid', nullable: true })
   referrer_id: string;
   ```

4. **Run migration:**
   ```bash
   npm run migration:run
   ```

5. **Verify:**
   ```sql
   DESCRIBE users;
   SHOW INDEXES FROM users WHERE Key_name LIKE '%REFERRER%';
   ```

#### Verification Checklist

- [ ] Migration runs successfully
- [ ] Column renamed correctly
- [ ] Type changed to UUID
- [ ] Foreign key created
- [ ] Index created
- [ ] Data integrity preserved

**Tài liệu tham khảo:**
- `12_MIGRATION_GUIDE_DETAILED.md` - Migration 1

---

### Task 2.2: Implement Referral Tracking

**Thời gian:** 4 giờ  
**Priority:** 🟠 HIGH

#### Backend Steps

1. **Update RegisterDto:**
   ```typescript
   @IsOptional()
   @IsString()
   @Length(5, 20)
   affiliate_code?: string;
   ```

2. **Update AuthService:**
   - Handle `affiliate_code` in register
   - Find referrer by code
   - Set `referrer_id` for new user

3. **Update User Entity:**
   - Add self-referencing relation
   - Add `@ManyToOne` relation

#### Frontend Steps

1. **Create `useReferral` hook:**
   - Track `?ref=CODE` query param
   - Save to LocalStorage and Cookie
   - Persist across page reloads

2. **Update Register Page:**
   - Read referral code from hook
   - Send to backend in register request

#### Verification Checklist

- [ ] Backend accepts `affiliate_code`
- [ ] Referrer is found and linked
- [ ] Frontend tracks referral code
- [ ] Code persists in LocalStorage/Cookie
- [ ] Works across page reloads

**Tài liệu tham khảo:**
- `02_Referral_Tracking.md` - Complete implementation guide

---

### Task 2.3: Add Payment Status Tracking

**Thời gian:** 1 giờ  
**Priority:** 🟠 HIGH

#### Steps

1. **Create migration:**
   ```bash
   npm run migration:create src/database/migrations/AddPaymentStatusToMeetings
   ```

2. **Implement migration:**
   - Add `payment_status` enum column
   - Add `payment_processed_at` timestamp
   - Add `payment_metadata` JSON
   - Create index

3. **Update Meeting Entity:**
   ```typescript
   @Column({ type: 'enum', enum: PaymentStatus, default: 'pending' })
   payment_status: PaymentStatus;
   
   @Column({ type: 'timestamp', nullable: true })
   payment_processed_at: Date;
   
   @Column({ type: 'json', nullable: true })
   payment_metadata: any;
   ```

#### Verification Checklist

- [ ] Migration runs successfully
- [ ] Columns added to meetings table
- [ ] Index created
- [ ] Entity updated

**Tài liệu tham khảo:**
- `12_MIGRATION_GUIDE_DETAILED.md` - Migration 2

---

## 🟡 PHASE 3: MEDIUM PRIORITY (Tuần sau)

### Task 3.1: Create Affiliate Module

**Thời gian:** 1 ngày  
**Priority:** 🟡 MEDIUM

#### Files to Create

1. **`affiliate.service.ts`**
   - Get affiliate stats
   - Get referral list
   - Get earnings history

2. **`affiliate.controller.ts`**
   - GET `/affiliate/stats`
   - GET `/affiliate/referrals`
   - GET `/affiliate/earnings`

3. **`affiliate.module.ts`**
   - Register service and controller
   - Import dependencies

4. **`dto/affiliate-stats.dto.ts`**
   - Response DTOs

#### Verification Checklist

- [ ] Service methods implemented
- [ ] Controller endpoints working
- [ ] Module registered in app
- [ ] DTOs validated

**Tài liệu tham khảo:**
- `04_Referral_Dashboard.md` - API specification

---

### Task 3.2: Create Dashboard UI

**Thời gian:** 1 ngày  
**Priority:** 🟡 MEDIUM

#### Frontend Files to Create

1. **`app/dashboard/affiliate/page.tsx`**
   - Main dashboard page
   - Display stats, referrals, earnings

2. **`components/affiliate/ReferralList.tsx`**
   - List of referred users
   - Status and earnings

3. **`components/affiliate/EarningsChart.tsx`**
   - Simple chart (optional - can be table first)

4. **`api/affiliate.rest.ts`**
   - API client functions

#### Verification Checklist

- [ ] Dashboard page renders
- [ ] Stats displayed correctly
- [ ] Referral list shows data
- [ ] API integration works
- [ ] Responsive design

**Tài liệu tham khảo:**
- `04_Referral_Dashboard.md` - Frontend specification

---

### Task 3.3: Implement Auto Revenue Sharing

**Thời gian:** 1 ngày  
**Priority:** 🟡 MEDIUM

#### Steps

1. **Create Meeting Ended Listener:**
   ```typescript
   @OnEvent('meeting.ended')
   async handleMeetingEnded(meeting: Meeting) {
     // Trigger revenue sharing
   }
   ```

2. **Update CreditsService:**
   - Add method to process revenue automatically
   - Update payment status

3. **Create Revenue Sweeper Job:**
   ```typescript
   @Cron('0 */6 * * *') // Every 6 hours
   async sweepPendingPayments() {
     // Find meetings with pending payment
     // Process revenue sharing
   }
   ```

#### Verification Checklist

- [ ] Listener triggers on meeting end
- [ ] Revenue sharing processes automatically
- [ ] Payment status updated
- [ ] Sweeper job runs correctly
- [ ] No duplicate processing

**Tài liệu tham khảo:**
- `03_Revenue_Sharing.md` - Implementation guide

---

## 🟢 PHASE 4: LOW PRIORITY (Phase 2.5 hoặc Phase 3)

### Task 4.1: Analytics Implementation

**Thời gian:** 2-3 ngày  
**Priority:** 🟢 LOW

#### Steps

1. **Create AnalyticsDailyStat Entity**
2. **Create Daily Analytics Job**
3. **Create Admin Analytics API**

**Lưu ý:** Có thể làm sau, không critical cho Phase 2.

**Tài liệu tham khảo:**
- `05_Analytics.md` - Specification

---

## 📊 TIMELINE TỔNG QUAN

| Phase | Tasks | Time | Priority |
|-------|-------|------|----------|
| **Phase 1** | Fix revenue logic + Unit tests | 3.5 giờ | 🔴 CRITICAL |
| **Phase 2** | Migration + Referral tracking | 7 giờ | 🟠 HIGH |
| **Phase 3** | Dashboard + Auto revenue | 3 ngày | 🟡 MEDIUM |
| **Phase 4** | Analytics | 2-3 ngày | 🟢 LOW |
| **TỔNG CỘNG** | | **~7-10 ngày** | |

---

## ✅ DAILY CHECKLIST

### Day 1 (Hôm nay)

- [ ] Fix revenue sharing logic (30 phút)
- [ ] Write unit tests (3 giờ)
- [ ] Run tests and verify (30 phút)

### Day 2

- [ ] Create migration for typo fix (1 giờ)
- [ ] Run migration (30 phút)
- [ ] Update User entity (30 phút)
- [ ] Start referral tracking backend (2 giờ)

### Day 3

- [ ] Complete referral tracking backend (2 giờ)
- [ ] Create frontend hook (1 giờ)
- [ ] Update register page (1 giờ)
- [ ] Test referral tracking (1 giờ)

### Day 4

- [ ] Payment status migration (1 giờ)
- [ ] Create affiliate module - Service (3 giờ)
- [ ] Create affiliate module - Controller (2 giờ)

### Day 5

- [ ] Create dashboard UI - Page (3 giờ)
- [ ] Create dashboard UI - Components (3 giờ)
- [ ] API integration (2 giờ)

### Day 6-7

- [ ] Auto revenue sharing listener (4 giờ)
- [ ] Revenue sweeper job (4 giờ)
- [ ] Integration testing (4 giờ)
- [ ] Bug fixes (4 giờ)

---

## 🎯 SUCCESS CRITERIA

### Phase 1 (Critical Fixes)

- ✅ Revenue sharing logic đúng 100%
- ✅ Unit tests cover 100% logic
- ✅ No regression in existing functionality

### Phase 2 (Core Features)

- ✅ Database schema chuẩn hóa
- ✅ Referral tracking hoạt động
- ✅ Payment status tracking implemented

### Phase 3 (Complete Implementation)

- ✅ Dashboard hiển thị đúng dữ liệu
- ✅ Auto revenue sharing hoạt động
- ✅ No duplicate processing

---

## 📚 TÀI LIỆU THAM KHẢO

### Critical Fixes

- `09_CRITICAL_ISSUES_AND_FIXES.md` - Vấn đề và cách fix
- `13_UNIT_TEST_REVENUE_SHARING.md` - Unit test spec

### Migration

- `12_MIGRATION_GUIDE_DETAILED.md` - Migration guide chi tiết

### Implementation

- `02_Referral_Tracking.md` - Referral tracking
- `03_Revenue_Sharing.md` - Revenue sharing
- `04_Referral_Dashboard.md` - Dashboard

### Testing

- `06_Testing_Guide.md` - Manual testing
- `13_UNIT_TEST_REVENUE_SHARING.md` - Unit tests

### Overview

- `14_DANH_GIA_TONG_QUAN_TAI_LIEU.md` - Đánh giá tài liệu
- `00_INDEX_TAI_LIEU.md` - Index tất cả tài liệu

---

## 🚨 RISKS & MITIGATION

### Risk 1: Revenue Logic Wrong Again

**Mitigation:**
- Write comprehensive unit tests
- Review by senior developer
- Test with real data

### Risk 2: Migration Data Loss

**Mitigation:**
- Backup database before migration
- Test migration on staging first
- Verify data integrity after migration

### Risk 3: Timeline Overrun

**Mitigation:**
- Focus on critical fixes first
- Defer analytics to Phase 2.5
- Daily progress review

---

## 📞 SUPPORT & QUESTIONS

Nếu có câu hỏi, tham khảo:

1. **Technical questions:** Technical specification files
2. **Implementation questions:** Implementation guides
3. **Bug fixes:** Critical issues file
4. **Testing:** Testing guide

---

**Prepared by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Execution


