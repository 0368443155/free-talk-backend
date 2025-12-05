# ⚡ QUICK START - TEST PHASE 1

**Thời gian:** 15 phút  
**Mục đích:** Test nhanh các features chính  

---

## 🚀 SETUP (2 phút)

```bash
# 1. Start backend
cd talkplatform-backend
npm run start:dev

# 2. Wait for startup, check logs
# Should see: "Nest application successfully started"
# Should see cron jobs every minute:
#   - "Checking for meetings to open..."
#   - "Checking for meetings to close..."
```

---

## ✅ TEST 1: BACKEND STARTUP (1 phút)

### Check Logs

**Expected:**
```
✅ Application is running on: http://localhost:3000
✅ [MeetingSchedulerService] Checking for meetings to open...
✅ [MeetingSchedulerService] Checking for meetings to close...
✅ [ReminderService] Checking for reminders to send...
```

**NOT Expected:**
```
❌ [ScheduleAutomationService] ... (should NOT appear)
❌ Entity "X" not found
❌ Cannot find module
```

---

## ✅ TEST 2: ENTITIES (2 phút)

### Quick Check

```bash
# In backend directory
cd talkplatform-backend

# Count entities
grep -c "^    [A-Z]" data-source.ts
# Should return: 52

# Test build
npm run build
# Should: Exit code 0, no errors
```

---

## ✅ TEST 3: AUTO SCHEDULE (5 phút)

### Create Test Meeting

```sql
USE talkplatform;

-- Create meeting that starts in 5 minutes
INSERT INTO meetings (
  id, title, scheduled_at, status, meeting_state,
  host_id, created_at, updated_at
) VALUES (
  UUID(),
  'Test Auto Open',
  TIMESTAMPADD(MINUTE, 5, NOW()),
  'scheduled',
  'scheduled',
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  NOW(),
  NOW()
);

-- Get meeting ID
SELECT id, title, scheduled_at, status, meeting_state 
FROM meetings 
WHERE title = 'Test Auto Open';
```

### Wait & Verify

**Wait 5 minutes, then check:**

```sql
-- Check meeting opened
SELECT 
  title,
  status, -- Should be 'live'
  meeting_state, -- Should be 'open'
  auto_opened_at -- Should be set
FROM meetings 
WHERE title = 'Test Auto Open';
```

**Check logs:**
```
✅ [MeetingSchedulerService] Opening meeting ... Test Auto Open
✅ [MeetingSchedulerService] Meeting ... opened successfully
✅ [MeetingSchedulerService] Notification sent to host
```

---

## ✅ TEST 4: NOTIFICATIONS (3 phút)

### Check Database

```sql
-- Check notifications created
SELECT 
  title,
  message,
  type,
  status,
  created_at
FROM notifications 
WHERE title = 'Class Started'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- ✅ At least 1 notification
- ✅ title = "Class Started"
- ✅ type = "in_app"
- ✅ status = "sent" or "pending"

---

## ✅ TEST 5: FRONTEND (2 phút)

```bash
# Start frontend
cd talkplatform-frontend
npm run dev

# Open browser: http://localhost:3001
```

### Quick Checks

1. **Homepage loads** ✅
2. **No console errors** ✅
3. **Navigate to `/teacher/availability-calendar`**
   - Calendar loads ✅
   - No errors ✅

---

## 📊 QUICK CHECKLIST

- [ ] Backend starts successfully
- [ ] Cron jobs running (MeetingSchedulerService only)
- [ ] 52 entities in data-source.ts
- [ ] Build successful
- [ ] Meeting auto-opens after 5 min
- [ ] Notification created in database
- [ ] Frontend starts
- [ ] Calendar page loads

---

## ✅ SUCCESS!

If all checks pass:
- ✅ **Phase 1 is working correctly!**
- ✅ **Ready for full testing** (see `30_TESTING_GUIDE.md`)
- ✅ **Ready for deployment**

---

## ❌ ISSUES?

### Backend won't start
```bash
npm install
npm run build
```

### Cron jobs not running
```bash
# Check meetings.module.ts has:
# ScheduleModule.forRoot()
```

### Entities not found
```bash
# Check data-source.ts
# Should have 52 entities
```

### Notifications not working
```bash
# Check Redis running
redis-cli ping
# Should return: PONG
```

---

## 📚 FULL TESTING

For comprehensive testing, see:
- 📖 **`30_TESTING_GUIDE.md`** - Detailed testing guide
- 📋 **`CHECKLIST.md`** - Full checklist
- 📊 **`29_COMPLETION_REPORT.md`** - What's completed

---

**Time:** 15 minutes  
**Difficulty:** Easy  
**Next:** Full testing or deployment
