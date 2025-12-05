# Phase 2 - Endpoint Review & Testing Guide

**Date:** 2025-01-03  
**Status:** ✅ READY FOR TESTING

---

## 📋 Endpoint Inventory

### ✅ New Affiliate Module Endpoints (Recommended)

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| GET | `/affiliate/dashboard` | Get dashboard statistics | ✅ JWT | ✅ Implemented |
| GET | `/affiliate/referrals?page=1&limit=20` | Get referrals list | ✅ JWT | ✅ Implemented |
| GET | `/affiliate/earnings-history?period=month` | Get earnings history | ✅ JWT | ✅ Implemented |
| GET | `/affiliate/validate/:code` | Validate affiliate code | ✅ JWT | ✅ Implemented |

### ⚠️ Duplicate/Old Endpoints (Deprecated)

| Method | Endpoint | Description | Status | Recommendation |
|--------|----------|-------------|--------|----------------|
| GET | `/credits/affiliate/stats` | Get affiliate stats | ❌ TODO | Deprecate → Use `/affiliate/dashboard` |
| GET | `/teachers/enhanced/affiliate/stats` | Get affiliate stats | ❓ Unknown | Deprecate → Use `/affiliate/dashboard` |
| GET | `/teachers/enhanced/affiliate/referrals` | Get referrals | ❌ TODO | Deprecate → Use `/affiliate/referrals` |

---

## 🧪 Test Suite

### Unit Tests

#### 1. AffiliateService Tests (`affiliate.service.spec.ts`)

✅ **Created:** `src/features/affiliate/affiliate.service.spec.ts`

**Test Cases:**
- ✅ `getStats()` - Returns affiliate stats with referrals and earnings
- ✅ `getStats()` - Returns zero earnings when no transactions
- ✅ `getStats()` - Throws NotFoundException if user not found
- ✅ `getReferrals()` - Returns paginated referrals with spending data
- ✅ `getReferrals()` - Handles empty referrals list
- ✅ `getEarningsHistory()` - Groups earnings by date
- ✅ `getEarningsHistory()` - Returns empty array when no earnings
- ✅ `validateAffiliateCode()` - Returns valid when code exists
- ✅ `validateAffiliateCode()` - Returns invalid when code does not exist
- ✅ `validateAffiliateCode()` - Returns invalid when code is empty

#### 2. Revenue Sharing Tests (`credits.service.spec.ts`)

✅ **Already exists:** `src/features/credits/credits.service.spec.ts`

**Test Cases Covered:**
- ✅ Organic student revenue sharing (30% platform, 70% teacher)
- ✅ Affiliate student revenue sharing (10% platform, 90% teacher)
- ✅ Free class handling (all zeros)
- ✅ Insufficient balance error
- ✅ `isAffiliateStudent()` logic

---

## 🔍 Integration Tests

### Test Checklist

#### Backend API Tests

1. **Affiliate Dashboard API**
   ```bash
   GET /affiliate/dashboard
   ```
   - [ ] Returns 200 OK with valid JWT token
   - [ ] Returns 401 Unauthorized without token
   - [ ] Returns correct stats structure
   - [ ] Returns zero values for new users
   - [ ] Calculates earnings correctly

2. **Referrals List API**
   ```bash
   GET /affiliate/referrals?page=1&limit=20
   ```
   - [ ] Returns paginated results
   - [ ] Returns correct total count
   - [ ] Includes referral spending data
   - [ ] Marks active/inactive correctly

3. **Earnings History API**
   ```bash
   GET /affiliate/earnings-history?period=month
   ```
   - [ ] Returns earnings grouped by date
   - [ ] Filters by period correctly (week/month/year)
   - [ ] Includes transaction details

4. **Validate Affiliate Code API**
   ```bash
   GET /affiliate/validate/ABC123
   ```
   - [ ] Returns valid=true for existing code
   - [ ] Returns valid=false for invalid code
   - [ ] Returns referrer info when valid

---

## 🧪 Manual Testing Guide

### Test Scenario 1: Complete Referral Flow

**Steps:**
1. User A (Teacher) registers → Gets affiliate code `ABC123`
2. User B registers with referral code `ABC123`
   - URL: `http://localhost:3000/register?ref=ABC123`
   - Check: `referrer_id` in database = User A's ID
3. User B joins a paid meeting (100 credits)
4. Check revenue sharing:
   - User B balance: -100 credits
   - User A (teacher) balance: +90 credits (90% of 100)
   - Platform fee: 10 credits

### Test Scenario 2: Affiliate Dashboard

**Steps:**
1. Login as User A (with referrals)
2. Navigate to `/dashboard/affiliate`
3. Check:
   - [ ] Referral link displays correctly
   - [ ] Total referrals count is correct
   - [ ] Total earnings calculated correctly
   - [ ] Recent referrals list shows
   - [ ] Earnings history chart displays

### Test Scenario 3: Revenue Sweeper Job

**Steps:**
1. Create a meeting with participants
2. End the meeting
3. Wait 30+ minutes
4. Check logs for RevenueSweeperJob execution
5. Verify:
   - [ ] Payment status updated to COMPLETED
   - [ ] Transactions created correctly
   - [ ] Balances updated correctly

---

## 📝 Test Commands

### Run Unit Tests

```bash
cd talkplatform-backend

# Run all tests
npm test

# Run affiliate tests only
npm test -- affiliate.service.spec

# Run credits service tests (revenue sharing)
npm test -- credits.service.spec

# Run with coverage
npm test -- --coverage
```

### Run Integration Tests

```bash
# Start backend
npm run start:dev

# Test endpoints using curl or Postman
curl -X GET http://localhost:3000/api/v1/affiliate/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Migration Plan for Duplicate Endpoints

### Option 1: Proxy to New Service (Recommended)

Update old endpoints to call new AffiliateService:

```typescript
// CreditsController
@Get('affiliate/stats')
async getAffiliateStats(@Request() req: any) {
  return this.affiliateService.getStats(req.user.id);
}

// EnhancedTeachersController  
@Get('affiliate/stats')
async getAffiliateStats(@Request() req: any) {
  return this.affiliateService.getStats(req.user.id);
}

@Get('affiliate/referrals')
async getAffiliateReferrals(@Query() paginationDto: PaginationDto, @Request() req: any) {
  return this.affiliateService.getReferrals(req.user.id, paginationDto.page, paginationDto.limit);
}
```

### Option 2: Mark as Deprecated

Add deprecation warnings and redirect clients to new endpoints.

### Option 3: Remove (After Migration)

Remove old endpoints after ensuring all clients use new ones.

---

## ✅ Testing Checklist Summary

### Backend
- [x] Unit tests for AffiliateService
- [x] Unit tests for Revenue Sharing logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for referral flow

### Frontend
- [ ] Dashboard page loads correctly
- [ ] Referral link copies to clipboard
- [ ] Stats display correctly
- [ ] Referrals list pagination works
- [ ] Earnings history period selector works

### Manual Testing
- [ ] Register with referral code
- [ ] Verify referral tracking in DB
- [ ] Test revenue sharing calculation
- [ ] Test revenue sweeper job
- [ ] Test dashboard UI

---

## 🎯 Next Steps

1. **Immediate:** Run unit tests to verify all pass
2. **Short-term:** Update old endpoints to proxy to new service
3. **Medium-term:** Add integration tests
4. **Long-term:** Deprecate and remove old endpoints

---

**Status:** ✅ TEST SUITE CREATED - READY FOR EXECUTION

