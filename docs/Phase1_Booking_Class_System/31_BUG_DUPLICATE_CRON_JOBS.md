# 🐛 BUG REPORT: DUPLICATE CRON JOBS

**Ngày phát hiện:** 05/12/2025  
**Severity:** 🔴 HIGH  
**Status:** ⚠️ IDENTIFIED - Needs Fix  

---

## 🚨 VẤN ĐỀ

Cron jobs đang chạy **NHIỀU LẦN** trong cùng 1 giây:

```
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] 20768  - 12/05/2025, 10:56:00 AM     LOG [MeetingSchedulerService] Checking for meetings to close...
```

**Impact:**
- Performance issue (6x queries)
- Potential race conditions
- Database load tăng 6x
- Logs spam

---

## 🔍 NGUYÊN NHÂN

**Root Cause:** `ScheduleModule.forRoot()` được gọi **8 lần** trong các modules khác nhau:

1. ✅ `tasks.module.ts`
2. ✅ `metrics.module.ts`
3. ✅ `schedules.module.ts`
4. ✅ `analytics.module.ts`
5. ✅ `payments.module.ts`
6. ✅ `meetings.module.ts` ← **Phase 1 module**
7. ✅ `global-chat.module.ts`
8. ✅ `monitoring.module.ts`

**Kết quả:** Mỗi `forRoot()` tạo ra 1 scheduler instance → 8 instances → Mỗi cron job chạy 8 lần!

---

## 📊 EVIDENCE

### Test Results

**Observed:**
- `autoOpenMeetings()` chạy **6 lần/phút**
- `autoCloseMeetings()` chạy **6 lần/phút**
- `ReminderService` chạy **6 lần/phút**
- `PaymentReleaseService` chạy **6 lần/phút**

**Expected:**
- Mỗi cron job chỉ chạy **1 lần/phút**

---

## 🎯 GIẢI PHÁP

### Option 1: Move ScheduleModule.forRoot() to AppModule (RECOMMENDED ⭐)

**Concept:**
- `ScheduleModule.forRoot()` chỉ gọi **1 lần** trong `AppModule`
- Tất cả modules khác **KHÔNG** import `ScheduleModule`
- Services với `@Cron()` decorators sẽ tự động được register

**Implementation:**

#### Step 1: Add to AppModule

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... existing imports ...
    ScheduleModule.forRoot(), // ← ADD THIS (only once!)
    
    // ... other modules ...
    MeetingsModule,
    SchedulesModule,
    PaymentsModule,
    // etc.
  ],
})
export class AppModule {}
```

#### Step 2: Remove from All Other Modules

**Files to modify:**
1. `src/tasks/tasks.module.ts`
2. `src/metrics/metrics.module.ts`
3. `src/features/schedules/schedules.module.ts`
4. `src/features/room-features/analytics/analytics.module.ts`
5. `src/features/payments/payments.module.ts`
6. `src/features/meeting/meetings.module.ts`
7. `src/features/global-chat/global-chat.module.ts`
8. `src/core/monitoring/monitoring.module.ts`

**Change:**
```typescript
// BEFORE
@Module({
  imports: [
    ScheduleModule.forRoot(), // ← REMOVE THIS
    // ...
  ],
})

// AFTER
@Module({
  imports: [
    // ScheduleModule.forRoot(), ← REMOVED
    // ...
  ],
})
```

---

### Option 2: Use Global ScheduleModule (Alternative)

**Concept:**
- Create a shared module that exports ScheduleModule
- Import this shared module everywhere

**Not Recommended** because Option 1 is simpler and follows NestJS best practices.

---

## 📝 IMPLEMENTATION GUIDE

### Quick Fix (5 minutes)

```bash
# 1. Edit app.module.ts
# Add: ScheduleModule.forRoot() to imports

# 2. Edit each module file
# Remove: ScheduleModule.forRoot() from imports

# 3. Restart backend
npm run start:dev

# 4. Verify logs
# Should see each cron job only ONCE per minute
```

---

### Detailed Steps

#### 1. Update AppModule

```typescript
// src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ /* ... */ }),
    RedisModule.forRootAsync({ /* ... */ }),
    BullModule.forRootAsync({ /* ... */ }),
    
    // ADD THIS LINE
    ScheduleModule.forRoot(),
    
    // Existing modules
    AuthModule,
    UsersModule,
    MeetingsModule,
    // ... etc
  ],
})
export class AppModule {}
```

#### 2. Update MeetingsModule

```typescript
// src/features/meeting/meetings.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([/* ... */]),
    // ScheduleModule.forRoot(), ← REMOVE THIS LINE
    forwardRef(() => LiveKitModule),
    // ... other imports
  ],
  // ...
})
export class MeetingsModule {}
```

#### 3. Update SchedulesModule

```typescript
// src/features/schedules/schedules.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([/* ... */]),
    // ScheduleModule.forRoot(), ← REMOVE THIS LINE
    NotificationsModule,
  ],
  // ...
})
export class SchedulesModule {}
```

#### 4. Repeat for Other Modules

Remove `ScheduleModule.forRoot()` from:
- tasks.module.ts
- metrics.module.ts
- analytics.module.ts
- payments.module.ts
- global-chat.module.ts
- monitoring.module.ts

---

## 🧪 VERIFICATION

### After Fix

**Expected logs:**
```
[Nest] LOG [MeetingSchedulerService] Checking for meetings to open...
[Nest] LOG [MeetingSchedulerService] Checking for meetings to close...
[Nest] LOG [ReminderService] Checking for meetings to send reminders...
```

**Each log should appear ONLY ONCE per minute**

### Test Commands

```bash
# 1. Restart backend
npm run start:dev

# 2. Watch logs for 2 minutes
# Count how many times each cron job runs

# 3. Verify
# - autoOpenMeetings: 1 time/minute ✅
# - autoCloseMeetings: 1 time/minute ✅
# - ReminderService: 1 time/minute ✅
```

---

## 📊 IMPACT ANALYSIS

### Before Fix
- **Cron jobs:** 6-8 times per minute
- **Database queries:** 6-8x normal
- **Performance:** Poor
- **Logs:** Spammed

### After Fix
- **Cron jobs:** 1 time per minute ✅
- **Database queries:** Normal ✅
- **Performance:** Good ✅
- **Logs:** Clean ✅

---

## ⚠️ RISKS

### Low Risk
- **Breaking changes:** None
- **Data loss:** None
- **Downtime:** None (just restart)

### Testing Needed
- [ ] Verify all cron jobs still run
- [ ] Verify timing is correct
- [ ] Verify no errors
- [ ] Monitor for 1 hour

---

## 📋 CHECKLIST

### Implementation
- [ ] Add `ScheduleModule.forRoot()` to AppModule
- [ ] Remove from tasks.module.ts
- [ ] Remove from metrics.module.ts
- [ ] Remove from schedules.module.ts
- [ ] Remove from analytics.module.ts
- [ ] Remove from payments.module.ts
- [ ] Remove from meetings.module.ts
- [ ] Remove from global-chat.module.ts
- [ ] Remove from monitoring.module.ts

### Testing
- [ ] Restart backend
- [ ] Check logs (2 minutes)
- [ ] Verify 1 execution per minute
- [ ] Test auto open
- [ ] Test auto close
- [ ] Test reminders
- [ ] Monitor for 1 hour

---

## 🎓 LESSONS LEARNED

### 1. forRoot() Pattern
**Lesson:** `forRoot()` should only be called ONCE in root module  
**Why:** Creates singleton instances  
**Action:** Always check before using forRoot()

### 2. Module Imports
**Lesson:** Be careful with module imports  
**Why:** Can create duplicate instances  
**Action:** Review module structure regularly

### 3. Testing
**Lesson:** Always check logs for duplicates  
**Why:** Easy to miss in development  
**Action:** Add to testing checklist

---

## 📞 NEXT STEPS

### Immediate
1. **Fix:** Implement Option 1
2. **Test:** Verify fix works
3. **Monitor:** Watch for 1 hour

### Short-term
1. **Document:** Update architecture docs
2. **Review:** Check other forRoot() usages
3. **Prevent:** Add linting rule

### Long-term
1. **Refactor:** Consider module structure
2. **Optimize:** Review cron job performance
3. **Monitor:** Add metrics for cron jobs

---

## 🔗 RELATED

**Files to modify:**
- `src/app.module.ts` - Add ScheduleModule.forRoot()
- `src/features/meeting/meetings.module.ts` - Remove
- `src/features/schedules/schedules.module.ts` - Remove
- `src/features/payments/payments.module.ts` - Remove
- `src/tasks/tasks.module.ts` - Remove
- `src/metrics/metrics.module.ts` - Remove
- `src/features/room-features/analytics/analytics.module.ts` - Remove
- `src/features/global-chat/global-chat.module.ts` - Remove
- `src/core/monitoring/monitoring.module.ts` - Remove

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Priority:** 🔴 HIGH  
**Effort:** 5 minutes  
**Status:** Ready to fix
