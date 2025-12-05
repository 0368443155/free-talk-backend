# PHÂN TÍCH DUPLICATE AUTO SCHEDULE SERVICES

**Ngày:** 05/12/2025  
**Status:** 🔍 ANALYSIS COMPLETE  
**Priority:** 🟡 HIGH  

---

## 🎯 VẤN ĐỀ

Có **2 auto schedule services** đang được register trong `MeetingsModule`:
1. `MeetingSchedulerService`
2. `ScheduleAutomationService`

Cả 2 đều có cron jobs chạy mỗi phút để mở/đóng meetings → **Conflict tiềm ẩn!**

---

## 📊 SO SÁNH CHI TIẾT

### 1. MeetingSchedulerService
**File:** `src/features/meeting/meeting-scheduler.service.ts`  
**Lines:** 247 lines

#### Features:
- ✅ Auto open meetings (10 phút trước)
- ✅ Auto close meetings (5 phút grace period)
- ✅ Xử lý **cả Lessons và Bookings**
- ✅ Manual trigger methods
- ✅ Detailed logging
- ✅ Update related entities (Booking, Lesson status)

#### Cron Jobs:
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async autoOpenMeetings() {
  // Grace period: 10 phút trước
  // Xử lý lessons + bookings
}

@Cron(CronExpression.EVERY_MINUTE)
async autoCloseMeetings() {
  // Grace period: 5 phút sau
  // Xử lý lessons + bookings
}
```

#### Logic Details:
**Open:**
- Lessons: Check `scheduled_datetime` getter
- Bookings: Check `scheduled_at` field
- Grace period: 10 phút trước start time
- Update: `status`, `started_at`, `auto_opened_at`, `meeting_state`

**Close:**
- Lessons: Check `is_past` + duration
- Bookings: Calculate end_time (60 phút default)
- Grace period: 5 phút sau end time
- Update: `status`, `ended_at`, `auto_closed_at`, `meeting_state`
- Update related: Booking/Lesson status

---

### 2. ScheduleAutomationService
**File:** `src/features/meeting/services/schedule-automation.service.ts`  
**Lines:** 146 lines

#### Features:
- ✅ Auto open meetings (15 phút trước)
- ✅ Auto close meetings (10 phút grace period)
- ✅ Xử lý **chỉ Lessons** (có lesson_id)
- ✅ Send notifications to host
- ✅ Simpler logic

#### Cron Jobs:
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async handleMeetingAutoOpen() {
  // Open threshold: 15 phút trước
  // Chỉ xử lý meetings có scheduled_at
}

@Cron(CronExpression.EVERY_MINUTE)
async handleMeetingAutoClose() {
  // Grace period: 10 phút sau
  // Chỉ xử lý lesson meetings
}
```

#### Logic Details:
**Open:**
- Query: `scheduled_at <= openThreshold` (15 phút trước)
- Only meetings with `meeting_state = 'scheduled'`
- Update: `status`, `meeting_state`, `auto_opened_at`
- **Send notification** to host

**Close:**
- Only LIVE meetings with `lesson_id`
- Calculate end time from lesson duration
- Grace period: 10 phút
- Update: `status`, `meeting_state`, `auto_closed_at`, `ended_at`
- **Send notification** to host

---

## 🔍 KEY DIFFERENCES

| Feature | MeetingSchedulerService | ScheduleAutomationService |
|---------|------------------------|---------------------------|
| **Scope** | Lessons + Bookings | Lessons only |
| **Open Grace** | 10 phút trước | 15 phút trước |
| **Close Grace** | 5 phút sau | 10 phút sau |
| **Notifications** | ❌ No | ✅ Yes (to host) |
| **Manual Triggers** | ✅ Yes | ❌ No |
| **Related Updates** | ✅ Booking/Lesson status | ❌ No |
| **Complexity** | Higher | Lower |
| **Lines of Code** | 247 | 146 |

---

## ⚠️ POTENTIAL ISSUES

### 1. Conflict Risk 🔴
**Problem:** Cả 2 services đều chạy mỗi phút
- Có thể update cùng 1 meeting 2 lần
- Race condition
- Duplicate notifications (nếu cả 2 đều send)

**Current Status:**
- `MeetingSchedulerService`: Xử lý lessons + bookings
- `ScheduleAutomationService`: Chỉ xử lý lessons (có `lesson_id`)
- **Overlap:** Lessons được xử lý bởi CẢ 2 services!

### 2. Inconsistent Behavior 🟡
**Problem:** Logic khác nhau
- Grace periods khác nhau (10 vs 15 phút)
- Notification behavior khác nhau
- Update fields khác nhau

### 3. Maintenance Burden 🟡
**Problem:** 2 codebases cho cùng 1 chức năng
- Khó maintain
- Bug fixes phải làm 2 lần
- Testing phức tạp hơn

---

## 🎯 RECOMMENDATION

### Option 1: Keep MeetingSchedulerService (RECOMMENDED ⭐)

**Rationale:**
- ✅ More comprehensive (handles both lessons + bookings)
- ✅ More detailed (updates related entities)
- ✅ Has manual triggers (useful for testing)
- ✅ Better logging
- ✅ More mature codebase

**Actions:**
1. **Remove** `ScheduleAutomationService`
2. **Add notifications** to `MeetingSchedulerService`
3. **Update** `MeetingsModule` to remove ScheduleAutomationService
4. **Test** thoroughly

**Changes Needed:**
```typescript
// In MeetingSchedulerService
private async openMeeting(meeting: Meeting, source: string) {
  // ... existing code ...
  
  // ADD: Send notification
  if (meeting.host) {
    await this.notificationService.send({
      userId: meeting.host.id,
      type: NotificationType.IN_APP,
      title: 'Class Started',
      message: `Your class "${meeting.title}" has started automatically.`,
      data: { meetingId: meeting.id },
    });
  }
}
```

---

### Option 2: Keep ScheduleAutomationService

**Rationale:**
- ✅ Simpler code
- ✅ Already has notifications
- ✅ Cleaner separation

**Issues:**
- ❌ Doesn't handle bookings
- ❌ No manual triggers
- ❌ Doesn't update related entities

**Not Recommended** because bookings are core to Phase 1

---

### Option 3: Merge Both Services

**Rationale:**
- ✅ Best of both worlds
- ✅ Single source of truth

**Actions:**
1. Create new unified service
2. Take comprehensive logic from MeetingSchedulerService
3. Add notifications from ScheduleAutomationService
4. Remove both old services

**Complexity:** High, not worth it for now

---

## 📋 ACTION PLAN (Option 1)

### Step 1: Add Notifications to MeetingSchedulerService

```typescript
// meeting-scheduler.service.ts
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

constructor(
  // ... existing ...
  private readonly notificationService: NotificationService,
) {}

private async openMeeting(meeting: Meeting, source: string) {
  // ... existing update code ...
  
  // ADD: Send notification
  if (meeting.host) {
    await this.notificationService.send({
      userId: meeting.host.id,
      type: NotificationType.IN_APP,
      title: 'Class Started',
      message: `Your class "${meeting.title}" has started automatically.`,
      data: { meetingId: meeting.id },
    });
  }
}

private async closeMeeting(meeting: Meeting, source: string, relatedId?: string) {
  // ... existing update code ...
  
  // ADD: Send notification
  if (meeting.host) {
    await this.notificationService.send({
      userId: meeting.host.id,
      type: NotificationType.IN_APP,
      title: 'Class Ended',
      message: `Your class "${meeting.title}" has ended automatically.`,
      data: { meetingId: meeting.id },
    });
  }
}
```

---

### Step 2: Remove ScheduleAutomationService from Module

```typescript
// meetings.module.ts
@Module({
  // ...
  providers: [
    MeetingsService,
    MeetingsGateway,
    EnhancedMeetingsGateway,
    WaitingRoomService,
    MeetingSchedulerService,
    // ScheduleAutomationService, // REMOVE THIS LINE
  ],
  exports: [
    MeetingsService, 
    WaitingRoomService, 
    LiveKitModule, 
    // ScheduleAutomationService, // REMOVE THIS LINE
  ],
})
```

---

### Step 3: Delete ScheduleAutomationService File

```bash
rm src/features/meeting/services/schedule-automation.service.ts
```

---

### Step 4: Test

```bash
# Start backend
npm run start:dev

# Check logs for:
# ✅ "Checking for meetings to open..." (from MeetingSchedulerService)
# ✅ "Checking for meetings to close..." (from MeetingSchedulerService)
# ❌ NO logs from ScheduleAutomationService
```

---

## 🧪 TESTING CHECKLIST

After implementing Option 1:

- [ ] Backend starts without errors
- [ ] Only MeetingSchedulerService cron jobs running
- [ ] Meetings open correctly (lessons + bookings)
- [ ] Meetings close correctly (lessons + bookings)
- [ ] Notifications sent to host (open + close)
- [ ] Related entities updated (Booking, Lesson status)
- [ ] No duplicate updates
- [ ] No race conditions

---

## 📊 IMPACT ANALYSIS

### Before Fix:
- ❌ 2 services running
- ❌ Potential conflicts
- ❌ Inconsistent behavior
- ❌ Higher maintenance cost

### After Fix (Option 1):
- ✅ 1 service running
- ✅ No conflicts
- ✅ Consistent behavior
- ✅ Lower maintenance cost
- ✅ Notifications included
- ✅ Comprehensive coverage (lessons + bookings)

---

## ⏳ CURRENT STATUS

- [x] ✅ Analysis complete
- [x] ✅ Recommendation made
- [ ] ⏳ Add notifications to MeetingSchedulerService
- [ ] ⏳ Remove ScheduleAutomationService from module
- [ ] ⏳ Delete ScheduleAutomationService file
- [ ] ⏳ Test implementation
- [ ] ⏳ Verify no conflicts

---

## 📝 NOTES

### Why MeetingSchedulerService is Better:
1. **Comprehensive:** Handles both lessons AND bookings (Phase 1 core)
2. **Detailed:** Updates related entities (Booking/Lesson status)
3. **Testable:** Has manual trigger methods
4. **Mature:** More lines of code = more thought out
5. **Flexible:** Easier to extend

### What to Add from ScheduleAutomationService:
1. ✅ Notifications to host (open + close)
2. ✅ That's it! Everything else is already better in MeetingSchedulerService

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Recommendation:** Option 1 - Keep MeetingSchedulerService  
**Priority:** 🟡 HIGH - Should fix this week  
**Effort:** ~30 minutes
