# PHASE 2 - CODEBASE VERIFICATION REPORT

**Ngày kiểm tra:** 03/12/2025  
**Mục đích:** Đối chiếu tài liệu Phase 2 với codebase hiện tại  
**Trạng thái:** 🔍 Đang kiểm tra

---

## 📊 TỔNG QUAN TRẠNG THÁI

Sau khi kiểm tra toàn bộ codebase, trạng thái Phase 2 Affiliate System:

| Component | Document Status | Code Status | Match? |
|-----------|----------------|-------------|--------|
| Referral Tracking | ✅ Documented | ⚠️ Partial | 60% |
| Revenue Sharing | ✅ Documented | ✅ Implemented | 80% |
| Dashboard UI | ✅ Documented | ❌ Missing | 0% |
| Analytics | ✅ Documented | ⚠️ Different | 40% |

**Overall Completion:** ~50%

---

## 1. REFERRAL TRACKING - KIỂM TRA

### 📄 Tài liệu yêu cầu

**File:** `02_Referral_Tracking.md`

**Yêu cầu:**
1. Fix typo `refferrer_id` → `referrer_id`
2. Add self-referencing relation
3. Track affiliate code khi register
4. Create Affiliate Controller
5. Frontend referral hook và register page update

### 🔍 Codebase hiện tại

#### ✅ Đã có

1. **User Entity** (`user.entity.ts`)
   - ✅ `affiliate_code` field (char(20), unique)
   - ⚠️ `refferrer_id` field (char(36)) - **CÓ TYPO**
   - ❌ Không có relation (`referred_by`, `referrals`)
   - ❌ Không có index trên `referrer_id`

2. **Database Schema**
   - ✅ Column `refferrer_id` tồn tại trong DB
   - ✅ Index `IDX_users_refferrer` đã có
   - ⚠️ Column name sai (typo)

#### ❌ Chưa có / Cần fix

1. **User Entity Issues:**
   ```typescript
   // ❌ HIỆN TẠI (SAI):
   @Column({ type: 'char', length: 36, nullable: true })
   refferrer_id: string; // TYPO!
   
   // ✅ CẦN FIX:
   @Column({ type: 'uuid', nullable: true })
   referrer_id: string;
   
   @ManyToOne(() => User, (user) => user.referrals)
   @JoinColumn({ name: 'referrer_id' })
   referred_by: User;
   
   @OneToMany(() => User, (user) => user.referred_by)
   referrals: User[];
   ```

2. **Auth Service:**
   - ❌ Chưa track affiliate code khi register
   - ❌ `CreateStudentDto` chưa có `affiliate_code` field
   - ❌ `UsersService.createStudent` chưa xử lý referrer

3. **Affiliate Controller:**
   - ❌ Không tồn tại `/affiliate` controller
   - ❌ Không có API endpoints cho referral link
   - ❌ Không có validate code endpoint

4. **Frontend:**
   - ❌ Không có `useReferral` hook
   - ❌ Register page chưa track `?ref=CODE`
   - ❌ Không có referral link generator UI

### 📋 Action Items

1. **CRITICAL:** Fix typo `refferrer_id` → `referrer_id` + Migration
2. **HIGH:** Add relations to User entity
3. **HIGH:** Implement affiliate code tracking in auth service
4. **MEDIUM:** Create Affiliate Controller và Service
5. **MEDIUM:** Create frontend referral hook
6. **LOW:** Update register page

---

## 2. REVENUE SHARING - KIỂM TRA

### 📄 Tài liệu yêu cầu

**File:** `03_Revenue_Sharing.md`

**Yêu cầu:**
1. Payment status enum trong Meeting entity
2. Revenue sharing constants (30%/10% platform fee)
3. Auto trigger revenue sharing khi end class
4. Transaction-based processing
5. Meeting ended listener
6. Revenue sweeper job

### 🔍 Codebase hiện tại

#### ✅ Đã có

1. **Revenue Sharing Logic:**
   - ✅ `CreditsService.processClassPayment()` đã implement
   - ✅ `isAffiliateStudent()` method đã có
   - ⚠️ Logic revenue share: `isAffiliateStudent ? 30% : 70%` - **SAI!**
     - Đúng phải là: `isAffiliateStudent ? 10% : 30%` platform fee

2. **Wallet Service:**
   - ✅ `WalletService.shareRevenue()` method đã có
   - ✅ Double-entry ledger transactions

3. **Transaction Entity:**
   - ✅ Có fields: `platform_fee_percentage`, `platform_fee_amount`, `teacher_amount`
   - ✅ Transaction tracking

#### ❌ Chưa có / Cần fix

1. **Meeting Entity:**
   - ❌ Không có `payment_status` enum
   - ❌ Không có `payment_processed_at`
   - ❌ Không có `payment_metadata`

2. **Revenue Sharing Constants:**
   - ❌ Không có file `revenue.constants.ts`
   - ⚠️ Logic hiện tại SAI:
     ```typescript
     // ❌ HIỆN TẠI (SAI):
     const platformPercentage = isAffiliateStudent ? 30 : 70;
     
     // ✅ ĐÚNG:
     const platformPercentage = isAffiliateStudent ? 10 : 30;
     ```

3. **Auto Trigger:**
   - ❌ Không có meeting ended listener
   - ❌ Không có auto trigger revenue sharing
   - ❌ Không có revenue sweeper job

4. **Payment Status Tracking:**
   - ❌ Không track payment status
   - ❌ Có thể bị duplicate processing

### 📋 Action Items

1. **CRITICAL:** Fix revenue sharing logic (10% vs 30%)
2. **HIGH:** Add payment status tracking to Meeting entity
3. **HIGH:** Create meeting ended listener
4. **MEDIUM:** Create revenue sweeper job
5. **LOW:** Add revenue constants file

---

## 3. REFERRAL DASHBOARD - KIỂM TRA

### 📄 Tài liệu yêu cầu

**File:** `04_Referral_Dashboard.md`

**Yêu cầu:**
1. Affiliate Controller với dashboard endpoints
2. Affiliate Service với stats aggregation
3. Frontend dashboard page
4. Referral list component
5. Earnings chart

### 🔍 Codebase hiện tại

#### ✅ Đã có

1. **Partial API:**
   - ⚠️ `CreditsController.getAffiliateStats()` - endpoint khác
   - ⚠️ `EnhancedTeachersController.getAffiliateStats()` - endpoint khác
   - ❌ Không có dedicated `/affiliate` controller

#### ❌ Chưa có

1. **Backend:**
   - ❌ Không có `AffiliateController`
   - ❌ Không có `AffiliateService`
   - ❌ Không có `/api/v1/affiliate/dashboard` endpoint
   - ❌ Không có `/api/v1/affiliate/link` endpoint
   - ❌ Không có `/api/v1/affiliate/validate/:code` endpoint

2. **Frontend:**
   - ❌ Không có `/dashboard/affiliate` page
   - ❌ Không có referral list component
   - ❌ Không có earnings chart
   - ❌ Không có referral link generator UI

### 📋 Action Items

1. **HIGH:** Create Affiliate Controller và Service
2. **HIGH:** Implement dashboard stats API
3. **HIGH:** Create frontend dashboard page
4. **MEDIUM:** Create referral list component
5. **LOW:** Add earnings chart

---

## 4. ANALYTICS - KIỂM TRA

### 📄 Tài liệu yêu cầu

**File:** `05_Analytics.md`

**Yêu cầu:**
1. `AnalyticsDailyStat` entity
2. Daily analytics job (00:05 AM)
3. Admin analytics API
4. Revenue/User growth metrics
5. Top referrers API

### 🔍 Codebase hiện tại

#### ✅ Đã có

1. **Analytics Services:**
   - ✅ `AnalyticsService` (room-features)
   - ✅ `MetricsDaily` entity (metrics)
   - ⚠️ Nhưng khác với yêu cầu (track room metrics, không phải affiliate metrics)

#### ❌ Chưa có

1. **Affiliate Analytics:**
   - ❌ Không có `AnalyticsDailyStat` entity cho affiliate
   - ❌ Không có daily job tổng hợp affiliate data
   - ❌ Không có admin analytics API cho revenue/user growth
   - ❌ Không có top referrers API

### 📋 Action Items

1. **MEDIUM:** Create `AnalyticsDailyStat` entity (nếu cần)
2. **MEDIUM:** Create daily analytics job
3. **LOW:** Create admin analytics API

---

## 📋 TỔNG HỢP VẤN ĐỀ

### Critical Issues (Phải fix ngay)

1. ⚠️ **Revenue Sharing Logic SAI**
   - Hiện tại: `isAffiliateStudent ? 30% : 70%`
   - Đúng: `isAffiliateStudent ? 10% : 30%` (platform fee)
   - **File:** `credits.service.ts:287`

2. ⚠️ **User Entity có TYPO**
   - `refferrer_id` → cần fix thành `referrer_id`
   - Cần migration để fix

3. ❌ **Không track affiliate code khi register**
   - Auth service chưa xử lý referral code

### High Priority (Tuần này)

4. ❌ **Không có Affiliate Controller/Service**
   - Thiếu toàn bộ affiliate module

5. ❌ **Không có Dashboard UI**
   - Thiếu frontend components

6. ❌ **Không auto trigger revenue sharing**
   - Cần listener và job

### Medium Priority (Tuần sau)

7. ❌ **Không có payment status tracking**
   - Cần add vào Meeting entity

8. ❌ **Thiếu analytics cho affiliate**
   - Cần daily job và APIs

---

## 📊 COMPLETION STATUS

### Backend: 40% ⚠️

| Feature | Status | Notes |
|---------|--------|-------|
| Referral Tracking | 40% | Có field nhưng thiếu logic |
| Revenue Sharing | 60% | Có logic nhưng SAI percentage |
| Dashboard API | 0% | Chưa có |
| Analytics | 10% | Có service khác, không phải affiliate |

### Frontend: 0% ❌

| Feature | Status | Notes |
|---------|--------|-------|
| Referral Hook | 0% | Chưa có |
| Register Page Update | 0% | Chưa có |
| Dashboard Page | 0% | Chưa có |
| Components | 0% | Chưa có |

### Database: 60% ⚠️

| Feature | Status | Notes |
|---------|--------|-------|
| Referrer Field | 60% | Có nhưng typo |
| Relations | 0% | Chưa có |
| Payment Status | 0% | Chưa có |
| Analytics Table | 0% | Chưa có |

---

## 🎯 ACTION PLAN

### Week 1: Fix Critical Issues

#### Day 1-2: Fix Database & Entity
- [ ] Create migration: Fix `refferrer_id` typo → `referrer_id`
- [ ] Update User entity: Add relations
- [ ] Update User entity: Fix column type (char → uuid)
- [ ] Run migration

#### Day 3-4: Fix Revenue Sharing
- [ ] Fix revenue sharing percentage logic
- [ ] Add payment status to Meeting entity
- [ ] Create revenue constants file
- [ ] Test revenue sharing logic

#### Day 5: Implement Referral Tracking
- [ ] Add affiliate_code to RegisterDto
- [ ] Update AuthService to track referral
- [ ] Test referral tracking

### Week 2: Implement Missing Features

#### Day 1-2: Affiliate Module
- [ ] Create AffiliateService
- [ ] Create AffiliateController
- [ ] Implement dashboard stats API
- [ ] Implement referral link API

#### Day 3-4: Frontend Dashboard
- [ ] Create referral hook
- [ ] Update register page
- [ ] Create dashboard page
- [ ] Create referral list component

#### Day 5: Auto Trigger & Testing
- [ ] Create meeting ended listener
- [ ] Create revenue sweeper job
- [ ] Integration testing
- [ ] Fix bugs

---

## 📝 DETAILED FINDINGS

### 1. Revenue Sharing Logic Error

**Location:** `talkplatform-backend/src/features/credits/credits.service.ts:287`

**Current Code (WRONG):**
```typescript
const platformPercentage = isAffiliateStudent ? 30 : 70;
```

**Should be:**
```typescript
const platformPercentage = isAffiliateStudent ? 10 : 30; // Platform fee
```

**Impact:** Revenue sharing calculation is completely wrong!

### 2. User Entity Typo

**Location:** `talkplatform-backend/src/users/user.entity.ts:69`

**Current:**
```typescript
@Column({ type: 'char', length: 36, nullable: true })
refferrer_id: string; // TYPO: refferrer
```

**Should be:**
```typescript
@Column({ type: 'uuid', nullable: true })
referrer_id: string; // Fixed typo
```

### 3. Missing Relations

User entity không có:
- `referred_by: User` relation
- `referrals: User[]` relation
- Foreign key constraint

### 4. Missing Affiliate Tracking

Auth service không track affiliate code:
- `CreateStudentDto` không có `affiliate_code` field
- `UsersService.createStudent()` không xử lý referrer
- Frontend không gửi referral code

---

## 🔧 FILES CẦN TẠO/SỬA

### Backend Files to Create

1. `src/features/affiliate/affiliate.service.ts` - NEW
2. `src/features/affiliate/affiliate.controller.ts` - NEW
3. `src/features/affiliate/affiliate.module.ts` - NEW
4. `src/features/affiliate/dto/affiliate-stats.dto.ts` - NEW
5. `src/core/constants/revenue.constants.ts` - NEW
6. `src/features/meeting/listeners/meeting-ended.listener.ts` - NEW
7. `src/features/cron/revenue-sweeper.job.ts` - NEW
8. `src/database/migrations/XXX-FixReferrerColumn.ts` - NEW

### Backend Files to Fix

1. `src/users/user.entity.ts` - Fix typo, add relations
2. `src/features/credits/credits.service.ts` - Fix revenue percentage
3. `src/features/meeting/entities/meeting.entity.ts` - Add payment status
4. `src/auth/dto/create-student.dto.ts` - Add affiliate_code
5. `src/users/users.service.ts` - Add referral tracking
6. `src/auth/auth.service.ts` - Add referral code handling

### Frontend Files to Create

1. `hooks/useReferral.ts` - NEW
2. `app/dashboard/affiliate/page.tsx` - NEW
3. `components/affiliate/ReferralList.tsx` - NEW
4. `components/affiliate/EarningsChart.tsx` - NEW
5. `api/affiliate.rest.ts` - NEW

### Frontend Files to Fix

1. `app/register/page.tsx` - Add referral tracking
2. Navigation - Add affiliate link

---

## ⚠️ CRITICAL ISSUES SUMMARY

### Issue 1: Revenue Sharing Logic WRONG ⚠️

**Current:**
- Affiliate student: Platform 30%, Teacher 70% ❌
- Organic student: Platform 70%, Teacher 30% ❌

**Should be:**
- Affiliate student: Platform 10%, Teacher 90% ✅
- Organic student: Platform 30%, Teacher 70% ✅

**Impact:** All revenue calculations are incorrect!

### Issue 2: Typo in Database Column ⚠️

**Current:** `refferrer_id` (typo)  
**Should be:** `referrer_id`

**Impact:** Column name inconsistent, hard to maintain

### Issue 3: No Referral Tracking ❌

**Impact:** Cannot track which users came from referrals

---

## ✅ RECOMMENDATIONS

### Immediate Actions (Today)

1. **Fix revenue sharing logic** - Critical bug!
2. **Create migration** to fix typo
3. **Fix User entity** - Add relations

### This Week

1. Implement referral tracking in auth
2. Create affiliate module
3. Fix revenue sharing completely

### Next Week

1. Create dashboard UI
2. Add auto trigger
3. Testing & optimization

---

**Prepared by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0

