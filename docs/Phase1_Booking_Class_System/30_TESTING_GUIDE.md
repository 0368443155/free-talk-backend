# 🧪 HƯỚNG DẪN TEST PHASE 1

**Ngày:** 05/12/2025  
**Mục đích:** Test tất cả features đã hoàn thành  
**Thời gian:** ~2 giờ  

---

## 📋 OVERVIEW

Hướng dẫn này sẽ giúp bạn test:
1. ✅ Backend startup & cron jobs
2. ✅ Auto schedule (mở/đóng meetings)
3. ✅ Notification system
4. ✅ Refund logic
5. ✅ Database entities
6. ✅ Calendar UI (frontend)

---

## 🚀 SETUP

### Prerequisites

```bash
# 1. Backend dependencies
cd talkplatform-backend
npm install

# 2. Frontend dependencies
cd ../talkplatform-frontend
npm install

# 3. Database running
# MySQL should be running on port 3306

# 4. Redis running (for notifications)
# Redis should be running on port 6379
```

### Environment Variables

Verify `.env` file có đầy đủ:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=talkplatform

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key

# Other configs...
```

---

## TEST 1: BACKEND STARTUP & CRON JOBS ⚡

### Objective
Verify backend starts successfully và cron jobs chạy đúng

### Steps

#### 1.1 Stop Existing Backend (if running)

```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual PID)
taskkill /PID 1964 /F
```

#### 1.2 Start Backend

```bash
cd talkplatform-backend
npm run start:dev
```

#### 1.3 Check Logs

**Expected Output:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] INFO [InstanceLoader] MeetingsModule dependencies initialized
[Nest] INFO [InstanceLoader] NotificationsModule dependencies initialized
...
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Application is running on: http://localhost:3000
```

**Wait 1 minute, then check for cron job logs:**
```
[MeetingSchedulerService] Checking for meetings to open...
[MeetingSchedulerService] Meeting open check completed
[MeetingSchedulerService] Checking for meetings to close...
[MeetingSchedulerService] Meeting close check completed
[ReminderService] Checking for reminders to send...
```

### ✅ Success Criteria

- [x] Backend starts without errors
- [x] No entity-related errors
- [x] Cron jobs log every minute
- [x] Only `MeetingSchedulerService` logs (not `ScheduleAutomationService`)

### ❌ Troubleshooting

**Error: "Cannot find module"**
```bash
npm install
npm run build
```

**Error: "EADDRINUSE"**
```bash
# Port 3000 is in use, kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Error: "Entity not found"**
```bash
# Check data-source.ts has all entities
# Should have 52 entities
```

---

## TEST 2: AUTO SCHEDULE (MỞ/ĐÓNG MEETINGS) 🕐

### Objective
Test meetings tự động mở/đóng theo schedule

### Setup Test Data

#### 2.1 Create Test Lesson

```sql
-- Connect to database
USE talkplatform;

-- Create a test lesson that starts in 5 minutes
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  scheduled_date,
  start_time,
  duration_minutes,
  status,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM courses LIMIT 1), -- Use existing course
  'Test Auto Schedule Lesson',
  'Testing auto open/close',
  CURDATE(), -- Today
  ADDTIME(CURTIME(), '00:05:00'), -- 5 minutes from now
  60, -- 60 minutes duration
  'scheduled',
  NOW(),
  NOW()
);

-- Create meeting for this lesson
INSERT INTO meetings (
  id,
  lesson_id,
  title,
  description,
  scheduled_at,
  status,
  meeting_state,
  host_id,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM lessons WHERE title = 'Test Auto Schedule Lesson'),
  'Test Auto Schedule Meeting',
  'Testing',
  TIMESTAMPADD(MINUTE, 5, NOW()), -- 5 minutes from now
  'scheduled',
  'scheduled',
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  NOW(),
  NOW()
);
```

#### 2.2 Verify Test Data

```sql
-- Check lesson
SELECT 
  id,
  title,
  scheduled_date,
  start_time,
  duration_minutes,
  status
FROM lessons 
WHERE title = 'Test Auto Schedule Lesson';

-- Check meeting
SELECT 
  id,
  title,
  scheduled_at,
  status,
  meeting_state,
  auto_opened_at,
  auto_closed_at
FROM meetings 
WHERE title = 'Test Auto Schedule Meeting';
```

### Test Execution

#### 2.3 Test Auto Open

**Wait for scheduled_at time (5 minutes)**

**Check logs:**
```
[MeetingSchedulerService] Checking for meetings to open...
[MeetingSchedulerService] Opening meeting <id> (lesson): Test Auto Schedule Meeting
[MeetingSchedulerService] Meeting <id> opened successfully (auto: true)
[MeetingSchedulerService] Notification sent to host <host_id> for meeting <id>
```

**Verify in database:**
```sql
SELECT 
  id,
  title,
  status, -- Should be 'live'
  meeting_state, -- Should be 'open'
  auto_opened_at, -- Should be set
  started_at -- Should be set
FROM meetings 
WHERE title = 'Test Auto Schedule Meeting';
```

#### 2.4 Test Auto Close

**Wait for end_time (60 minutes + 5 minutes grace period)**

**Check logs:**
```
[MeetingSchedulerService] Checking for meetings to close...
[MeetingSchedulerService] Closing meeting <id> (lesson): Test Auto Schedule Meeting
[MeetingSchedulerService] Meeting <id> closed successfully (auto: true)
[MeetingSchedulerService] Notification sent to host <host_id> for meeting <id>
```

**Verify in database:**
```sql
SELECT 
  id,
  title,
  status, -- Should be 'ended'
  meeting_state, -- Should be 'closed'
  auto_closed_at, -- Should be set
  ended_at -- Should be set
FROM meetings 
WHERE title = 'Test Auto Schedule Meeting';

-- Check lesson status
SELECT 
  id,
  title,
  status -- Should be 'completed'
FROM lessons 
WHERE title = 'Test Auto Schedule Lesson';
```

### ✅ Success Criteria

- [x] Meeting opens automatically 10 minutes before scheduled_at
- [x] Meeting status changes to 'live'
- [x] meeting_state changes to 'open'
- [x] auto_opened_at is set
- [x] Meeting closes automatically after end_time + 5 min grace
- [x] Meeting status changes to 'ended'
- [x] meeting_state changes to 'closed'
- [x] auto_closed_at is set
- [x] Lesson status changes to 'completed'
- [x] Notifications sent to host

---

## TEST 3: NOTIFICATION SYSTEM 🔔

### Objective
Test notifications được gửi đúng và hiển thị đúng

### 3.1 Test Meeting Start Notification

**From Test 2 above, verify:**

```sql
-- Check notifications table
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  status,
  is_read,
  sent_at,
  created_at
FROM notifications 
WHERE title = 'Class Started'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- `title`: "Class Started"
- `message`: "Your class "Test Auto Schedule Meeting" has started automatically."
- `type`: "in_app"
- `status`: "sent" or "pending"
- `user_id`: Host's user ID

### 3.2 Test Meeting End Notification

```sql
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  status,
  is_read,
  sent_at,
  created_at
FROM notifications 
WHERE title = 'Class Ended'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- `title`: "Class Ended"
- `message`: "Your class "Test Auto Schedule Meeting" has ended automatically."

### 3.3 Test 20-Minute Reminder

**Create booking that starts in 20 minutes:**

```sql
-- Create booking
INSERT INTO bookings (
  id,
  meeting_id,
  student_id,
  teacher_id,
  status,
  credits_paid,
  scheduled_at,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM meetings WHERE status = 'scheduled' LIMIT 1),
  (SELECT id FROM users WHERE role = 'student' LIMIT 1),
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  'confirmed',
  100,
  TIMESTAMPADD(MINUTE, 20, NOW()), -- 20 minutes from now
  NOW(),
  NOW()
);
```

**Wait 1 minute for cron job to run**

**Check logs:**
```
[ReminderService] Checking for reminders to send...
[ReminderService] Found X bookings needing reminders
[ReminderService] Sent reminder for booking <id>
```

**Verify in database:**
```sql
-- Check booking reminder flag
SELECT 
  id,
  scheduled_at,
  reminder_sent_20min, -- Should be true
  reminder_sent_at -- Should be set
FROM bookings 
WHERE reminder_sent_20min = true
ORDER BY created_at DESC 
LIMIT 5;

-- Check notification
SELECT 
  id,
  user_id,
  title,
  message,
  created_at
FROM notifications 
WHERE message LIKE '%20 minutes%'
ORDER BY created_at DESC 
LIMIT 5;
```

### ✅ Success Criteria

- [x] Meeting start notification sent
- [x] Meeting end notification sent
- [x] 20-minute reminder sent
- [x] Notifications in database
- [x] reminder_sent_20min flag updated

---

## TEST 4: REFUND LOGIC 💰

### Objective
Test refund được tính đúng theo policy

### 4.1 Test Teacher Cancel (100% Refund)

**Create and cancel booking:**

```sql
-- Create booking
INSERT INTO bookings (
  id,
  meeting_id,
  student_id,
  teacher_id,
  status,
  credits_paid,
  scheduled_at,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM meetings WHERE status = 'scheduled' LIMIT 1),
  (SELECT id FROM users WHERE role = 'student' LIMIT 1),
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  'confirmed',
  100,
  TIMESTAMPADD(DAY, 1, NOW()), -- Tomorrow
  NOW(),
  NOW()
);

-- Get booking ID
SET @booking_id = (SELECT id FROM bookings ORDER BY created_at DESC LIMIT 1);
```

**Cancel via API:**
```bash
# Use Postman or curl
curl -X PATCH http://localhost:3000/api/v1/bookings/{booking_id}/cancel \
  -H "Authorization: Bearer {teacher_token}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Teacher cancelled"}'
```

**Verify refund:**
```sql
SELECT 
  id,
  status, -- Should be 'cancelled'
  credits_paid, -- 100
  credits_refunded, -- Should be 100 (100%)
  cancelled_by,
  cancellation_reason,
  cancelled_at
FROM bookings 
WHERE id = @booking_id;

-- Check wallet transactions
SELECT 
  id,
  user_id,
  amount,
  type,
  description,
  created_at
FROM ledger_entries 
WHERE description LIKE '%refund%'
ORDER BY created_at DESC 
LIMIT 5;
```

### 4.2 Test Student Cancel >24h (100% Refund)

```sql
-- Create booking >24h in future
INSERT INTO bookings (
  id,
  meeting_id,
  student_id,
  teacher_id,
  status,
  credits_paid,
  scheduled_at,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM meetings WHERE status = 'scheduled' LIMIT 1),
  (SELECT id FROM users WHERE role = 'student' LIMIT 1),
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  'confirmed',
  100,
  TIMESTAMPADD(HOUR, 25, NOW()), -- 25 hours from now
  NOW(),
  NOW()
);
```

**Cancel as student, verify 100% refund**

### 4.3 Test Student Cancel <24h (50% Refund)

```sql
-- Create booking <24h in future
INSERT INTO bookings (
  id,
  meeting_id,
  student_id,
  teacher_id,
  status,
  credits_paid,
  scheduled_at,
  created_at,
  updated_at
) VALUES (
  UUID(),
  (SELECT id FROM meetings WHERE status = 'scheduled' LIMIT 1),
  (SELECT id FROM users WHERE role = 'student' LIMIT 1),
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  'confirmed',
  100,
  TIMESTAMPADD(HOUR, 12, NOW()), -- 12 hours from now
  NOW(),
  NOW()
);
```

**Cancel as student, verify 50% refund (credits_refunded = 50)**

### ✅ Success Criteria

- [x] Teacher cancel = 100% refund
- [x] Student cancel >24h = 100% refund
- [x] Student cancel <24h = 50% refund
- [x] Wallet transactions created
- [x] Booking status updated to 'cancelled'

---

## TEST 5: DATABASE ENTITIES ✅

### Objective
Verify all entities registered correctly

### 5.1 Check Entity Count

```bash
cd talkplatform-backend

# Count entities in data-source.ts
grep -c "^    [A-Z]" data-source.ts
# Should return 52
```

### 5.2 Test Entity Queries

```typescript
// Create test file: test-entities.ts
import { DataSource } from 'typeorm';
import dataSource from './data-source';

async function testEntities() {
  await dataSource.initialize();
  
  // Test each entity
  const entities = [
    'User', 'TeacherProfile', 'Meeting', 'Booking', 
    'BookingSlot', 'Schedule', 'Notification', 
    'LedgerEntry', 'LedgerTransaction'
  ];
  
  for (const entity of entities) {
    try {
      const repo = dataSource.getRepository(entity);
      const count = await repo.count();
      console.log(`✅ ${entity}: ${count} records`);
    } catch (error) {
      console.error(`❌ ${entity}: ${error.message}`);
    }
  }
  
  await dataSource.destroy();
}

testEntities();
```

**Run:**
```bash
ts-node test-entities.ts
```

### ✅ Success Criteria

- [x] All 52 entities registered
- [x] No "Entity not found" errors
- [x] Can query all entities

---

## TEST 6: CALENDAR UI (FRONTEND) 📅

### Objective
Test calendar pages hoạt động

### 6.1 Start Frontend

```bash
cd talkplatform-frontend
npm run dev
```

**Access:** http://localhost:3001

### 6.2 Test Teacher Availability Calendar

**Navigate to:** `/teacher/availability-calendar`

**Expected:**
- ✅ Calendar component loads
- ✅ Shows current month
- ✅ Can switch views (Month/Week/Day)
- ✅ Can select time slots
- ✅ No console errors

### 6.3 Test Student Booking Calendar

**Navigate to:** `/teachers/{teacher_id}/book-calendar`

**Expected:**
- ✅ Calendar loads with teacher's available slots
- ✅ Can view teacher's schedule
- ✅ Can select slot to book
- ✅ Booking form appears

### 6.4 Test Notification Bell

**Check main navigation:**

**Expected:**
- ✅ Notification bell icon visible
- ✅ Shows unread count badge
- ✅ Click opens dropdown
- ✅ Shows recent notifications
- ✅ Can mark as read

### ✅ Success Criteria

- [x] Calendar pages load without errors
- [x] react-big-calendar working
- [x] Can interact with calendar
- [x] Notification bell integrated
- [x] API calls successful

---

## 📊 TEST SUMMARY CHECKLIST

### Backend Tests
- [ ] Backend starts successfully
- [ ] Cron jobs running (MeetingSchedulerService only)
- [ ] Auto open meetings works
- [ ] Auto close meetings works
- [ ] Notifications sent on open
- [ ] Notifications sent on close
- [ ] 20-minute reminders work
- [ ] Refund logic correct (100%, 100%, 50%)
- [ ] All entities queryable

### Frontend Tests
- [ ] Frontend starts successfully
- [ ] Teacher availability calendar works
- [ ] Student booking calendar works
- [ ] Notification bell visible
- [ ] Notification bell functional
- [ ] No console errors

### Database Tests
- [ ] All 52 entities registered
- [ ] All migrations executed (46/46)
- [ ] Test data created successfully
- [ ] Queries work correctly

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Cron Jobs Not Running

**Symptoms:** No logs every minute

**Fix:**
```typescript
// Check meetings.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Must be here
    // ...
  ],
})
```

### Issue 2: Notifications Not Sent

**Symptoms:** No notifications in database

**Fix:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check Bull queue
redis-cli
> KEYS bull:*
```

### Issue 3: Entities Not Found

**Symptoms:** "Entity X not found"

**Fix:**
```bash
# Rebuild
npm run build

# Check data-source.ts has the entity
grep "EntityName" data-source.ts
```

---

## 📝 TEST REPORT TEMPLATE

```markdown
# Phase 1 Test Report

**Date:** 05/12/2025
**Tester:** [Your Name]

## Test Results

### Backend (X/9 passed)
- [ ] Backend startup
- [ ] Cron jobs
- [ ] Auto open
- [ ] Auto close
- [ ] Notifications (open)
- [ ] Notifications (close)
- [ ] Reminders
- [ ] Refund logic
- [ ] Entities

### Frontend (X/5 passed)
- [ ] Frontend startup
- [ ] Teacher calendar
- [ ] Student calendar
- [ ] Notification bell
- [ ] No errors

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🎯 NEXT STEPS

After completing tests:

1. **Document results** - Fill test report
2. **Fix bugs** - Address any issues found
3. **Re-test** - Verify fixes work
4. **Deploy to staging** - If all tests pass
5. **Production deployment** - Final step

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Estimated Time:** 2 hours  
**Difficulty:** Medium  

**Good luck with testing!** 🚀
