# PHASE 2 - CRITICAL ISSUES & FIXES

**Ngày tạo:** 03/12/2025  
**Mục đích:** Liệt kê các vấn đề nghiêm trọng và cách fix  
**Trạng thái:** 🚨 URGENT FIXES NEEDED

---

## 🚨 CRITICAL ISSUE #1: REVENUE SHARING LOGIC WRONG

### Vấn đề

**File:** `talkplatform-backend/src/features/credits/credits.service.ts:287`

**Current Code (WRONG):**
```typescript
const platformPercentage = isAffiliateStudent ? 30 : 70;
const teacherPercentage = 100 - platformPercentage;

const platformFee = (meeting.price_credits * platformPercentage) / 100;
const teacherEarning = meeting.price_credits - platformFee;
```

**Policy theo tài liệu:**
- **Teacher Referral (affiliate):** Platform 10%, Teacher 90%
- **Platform Source (organic):** Platform 30%, Teacher 70%

**Current Logic Result:**
- Affiliate student: Platform 30% ❌ (sai, phải là 10%)
- Organic student: Platform 70% ❌ (sai, phải là 30%)

### Fix

```typescript
// Option 1: Store platform fee percentage
const platformFeePercentage = isAffiliateStudent ? 10 : 30; // Platform takes this %
const platformFee = (meeting.price_credits * platformFeePercentage) / 100;
const teacherEarning = meeting.price_credits - platformFee;

// Or use constants:
import { REVENUE_SHARE } from '@/core/constants/revenue.constants';
const platformFeePercentage = isAffiliateStudent 
  ? REVENUE_SHARE.PLATFORM_REFERRAL * 100  // 10%
  : REVENUE_SHARE.PLATFORM_DEFAULT * 100;  // 30%
```

**File to fix:** `credits.service.ts:287`

---

## 🚨 CRITICAL ISSUE #2: DATABASE COLUMN TYPO

### Vấn đề

**File:** `talkplatform-backend/src/users/user.entity.ts:69`

**Current:**
```typescript
@Column({ type: 'char', length: 36, nullable: true })
refferrer_id: string; // TYPO: refferrer (3 r's)
```

**Should be:**
```typescript
@Column({ type: 'uuid', nullable: true })
referrer_id: string; // Correct spelling
```

### Fix

1. **Create Migration:**
   ```typescript
   // Rename column
   await queryRunner.renameColumn('users', 'refferrer_id', 'referrer_id');
   
   // Change type to UUID
   await queryRunner.changeColumn('users', 'referrer_id', new TableColumn({
     name: 'referrer_id',
     type: 'uuid',
     isNullable: true
   }));
   ```

2. **Update Entity:**
   - Fix column name
   - Change type from char(36) to uuid
   - Add relations

**Impact:** All queries using this field need to be updated

---

## 🚨 CRITICAL ISSUE #3: NO REFERRAL TRACKING

### Vấn đề

**Missing:**
1. Auth service không xử lý affiliate code khi register
2. RegisterDto không có affiliate_code field
3. Frontend không track `?ref=CODE` query param

### Fix Required

1. **Update RegisterDto:**
   ```typescript
   export class CreateStudentDto {
     // ... existing fields
     
     @IsOptional()
     @IsString()
     @Length(5, 20)
     affiliate_code?: string;
   }
   ```

2. **Update UsersService:**
   ```typescript
   async createStudent(dto: CreateStudentDto): Promise<User> {
     let referrer: User = null;
     
     if (dto.affiliate_code) {
       referrer = await this.usersRepository.findOne({
         where: { affiliate_code: dto.affiliate_code }
       });
     }
     
     const user = this.usersRepository.create({
       ...dto,
       referrer_id: referrer ? referrer.id : null,
     });
     
     return await this.usersRepository.save(user);
   }
   ```

3. **Frontend:**
   - Create `useReferral` hook
   - Update register page

---

## 📋 PRIORITY FIX LIST

### Immediate (Today)

1. **Fix Revenue Sharing Logic** ⚠️ CRITICAL
   - File: `credits.service.ts:287`
   - Change: `30 : 70` → `10 : 30` (platform fee)

2. **Create Migration for Typo Fix** ⚠️ HIGH
   - Rename column
   - Update entity

3. **Fix User Entity** ⚠️ HIGH
   - Fix typo
   - Add relations

### This Week

4. **Implement Referral Tracking** ⚠️ HIGH
   - Update auth service
   - Update register page

5. **Create Affiliate Module** ⚠️ MEDIUM
   - Service, Controller, Module

---

## 🔧 QUICK FIX GUIDE

### Fix 1: Revenue Sharing (5 minutes)

**File:** `talkplatform-backend/src/features/credits/credits.service.ts`

**Find line 287:**
```typescript
const platformPercentage = isAffiliateStudent ? 30 : 70;
```

**Replace with:**
```typescript
// Platform fee percentage (10% for referral, 30% for organic)
const platformFeePercentage = isAffiliateStudent ? 10 : 30;
const teacherPercentage = 100 - platformFeePercentage;

const platformFee = (meeting.price_credits * platformFeePercentage) / 100;
const teacherEarning = meeting.price_credits - platformFee;
```

**Also update:**
- Line 306: `platform_fee_percentage: platformFeePercentage,`
- Line 326: `platform_fee_percentage: platformFeePercentage,`
- Line 353: `revenue_share: \`${platformFeePercentage}% platform / ${teacherPercentage}% teacher\``

---

### Fix 2: Database Typo (30 minutes)

1. **Create migration file**
2. **Run migration**
3. **Update entity**
4. **Update all queries**

**Chi tiết:** Xem `12_MIGRATION_GUIDE_DETAILED.md` - Migration 1

---

### Fix 3: Write Unit Tests (3 giờ)

**Mục đích:** Đảm bảo logic tính tiền không bao giờ bị sai lại.

**File:** `talkplatform-backend/src/features/credits/credits.service.spec.ts`

**Chi tiết:** Xem `13_UNIT_TEST_REVENUE_SHARING.md` - Test specification đầy đủ

**Test cases cần cover:**
- ✅ Organic student: 30% platform, 70% teacher
- ✅ Affiliate student: 10% platform, 90% teacher
- ✅ Edge cases: 0 credits, high value, rounding
- ✅ Error cases: insufficient balance

---

## 📚 TÀI LIỆU LIÊN QUAN

### Migration Guide
- **File:** `12_MIGRATION_GUIDE_DETAILED.md`
- **Nội dung:** Chi tiết cách tạo và chạy migrations cho Phase 2
- **Includes:**
  - Migration 1: Fix Referrer Column (typo + type)
  - Migration 2: Add Payment Status to Meetings
  - Verification steps
  - Rollback procedures

### Unit Test Guide
- **File:** `13_UNIT_TEST_REVENUE_SHARING.md`
- **Nội dung:** Unit test specification toàn diện cho revenue sharing
- **Includes:**
  - Complete test file structure
  - All test cases (organic, affiliate, edge cases)
  - Helper functions
  - Coverage requirements

### Đánh Giá Tổng Quan
- **File:** `14_DANH_GIA_TONG_QUAN_TAI_LIEU.md`
- **Nội dung:** Đánh giá chi tiết về chất lượng tài liệu Phase 2
- **Includes:**
  - Phân tích các vấn đề nghiêm trọng
  - Đánh giá giải pháp kỹ thuật
  - Timeline và khả thi
  - Hành động khuyến nghị

---

**Created by:** AI Assistant  
**Date:** 03/12/2025  
**Priority:** 🚨 CRITICAL  
**Last Updated:** 03/12/2025

