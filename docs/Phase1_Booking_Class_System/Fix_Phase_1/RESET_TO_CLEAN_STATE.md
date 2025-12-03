# RESET TO CLEAN STATE - GUIDE

**Date:** 03/12/2025 15:30 ICT  
**Target Commit:** 102e5e26b052b4a0da0742eac3ffca8a14b98cc0  
**Reason:** Too many migration errors, starting fresh

---

## ⚠️ IMPORTANT: BACKUP FIRST!

Before proceeding, **BACKUP YOUR DATABASE**:

```bash
# Navigate to backend
cd talkplatform-backend

# Create backup directory
mkdir -p backups

# Backup database (replace with your credentials)
mysqldump -u YOUR_USERNAME -p YOUR_DATABASE_NAME > backups/backup_before_reset_20251203.sql

# Verify backup was created
ls -lh backups/
```

---

## 🔄 STEP 1: RESET CODE

### Option A: Hard Reset (Discards all changes)

```bash
# Go to project root
cd d:\LamHoang\4talk\free-talk

# Hard reset to target commit
git reset --hard 102e5e26b052b4a0da0742eac3ffca8a14b98cc0

# Force push to remote (⚠️ This will overwrite remote!)
git push -f origin main
```

### Option B: Soft Reset (Keeps changes as uncommitted)

```bash
# Soft reset (keeps your changes)
git reset --soft 102e5e26b052b4a0da0742eac3ffca8a14b98cc0

# Check what will be discarded
git status

# If you want to discard everything
git reset --hard HEAD
```

---

## 🗄️ STEP 2: RESTORE DATABASE

### Option 1: Drop Phase 1 Changes Only

If you want to keep your data but remove Phase 1 migrations:

```sql
-- Connect to MySQL
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME

-- Drop Phase 1 columns from meetings
ALTER TABLE meetings DROP COLUMN IF EXISTS state;
ALTER TABLE meetings DROP COLUMN IF EXISTS opened_at;
ALTER TABLE meetings DROP COLUMN IF EXISTS closed_at;
ALTER TABLE meetings DROP COLUMN IF EXISTS auto_opened;
ALTER TABLE meetings DROP COLUMN IF EXISTS auto_closed;
ALTER TABLE meetings DROP COLUMN IF EXISTS requires_manual_review;
ALTER TABLE meetings DROP COLUMN IF EXISTS review_reason;

-- Drop Phase 1 columns from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent_20min;
ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent_at;
ALTER TABLE bookings DROP COLUMN IF EXISTS student_notes;
ALTER TABLE bookings DROP COLUMN IF EXISTS teacher_notes;

-- Drop Phase 1 columns from notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS status;
ALTER TABLE notifications DROP COLUMN IF EXISTS sent_at;

-- Drop meeting_participants table
DROP TABLE IF EXISTS meeting_participants;

-- Drop Phase 1 indexes
DROP INDEX IF EXISTS idx_meetings_state ON meetings;
DROP INDEX IF EXISTS idx_meetings_opened_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_closed_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_state_scheduled_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_state_started_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_status_scheduled_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_status_started_at ON meetings;
DROP INDEX IF EXISTS idx_meetings_scheduled_at ON meetings;

DROP INDEX IF EXISTS idx_bookings_status_scheduled_at ON bookings;
DROP INDEX IF EXISTS idx_bookings_meeting_id_status ON bookings;
DROP INDEX IF EXISTS idx_bookings_reminder_20min ON bookings;

DROP INDEX IF EXISTS idx_notifications_status ON notifications;
DROP INDEX IF EXISTS idx_notifications_user_status ON notifications;

-- Remove Phase 1 migration records
DELETE FROM migrations WHERE name LIKE '%Phase1%';
DELETE FROM migrations WHERE name LIKE '%AddMeetingStateTracking%';
DELETE FROM migrations WHERE name LIKE '%CreateMeetingParticipants%';
DELETE FROM migrations WHERE name LIKE '%AddBookingNotes%';
DELETE FROM migrations WHERE name LIKE '%AddNotificationStatusFields%';
```

### Option 2: Full Database Restore

If you have a backup from before Phase 1:

```bash
# Restore from backup
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME < path/to/your/backup.sql
```

### Option 3: Fresh Database

If you want to start completely fresh:

```bash
# Drop and recreate database
mysql -u YOUR_USERNAME -p -e "DROP DATABASE IF EXISTS YOUR_DATABASE_NAME;"
mysql -u YOUR_USERNAME -p -e "CREATE DATABASE YOUR_DATABASE_NAME;"

# Run migrations from scratch
cd talkplatform-backend
npm run migration:run
```

---

## ✅ STEP 3: VERIFY

After reset, verify everything:

```bash
# 1. Check git status
git status
git log --oneline -5

# 2. Check database
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME -e "SHOW TABLES;"
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME -e "DESCRIBE meetings;"
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME -e "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;"

# 3. Test application
cd talkplatform-backend
npm install
npm run build
npm run start:dev
```

---

## 📋 VERIFICATION CHECKLIST

After reset:

- [ ] Git is at commit `102e5e2`
- [ ] Database backup created
- [ ] Phase 1 columns removed from database
- [ ] Application starts without errors
- [ ] No TypeScript compilation errors
- [ ] Can access the application

---

## 🔙 ROLLBACK (If Something Goes Wrong)

If you need to undo the reset:

```bash
# Find the commit you were at
git reflog

# Reset back to it (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Restore database from backup
mysql -u YOUR_USERNAME -p YOUR_DATABASE_NAME < backups/backup_before_reset_20251203.sql
```

---

## 📞 NEXT STEPS

After successful reset:

1. ✅ Verify application works
2. ✅ Plan Phase 1 implementation more carefully
3. ✅ Test migrations in development first
4. ✅ Use proper migration workflow

---

**IMPORTANT NOTES:**

- Always backup before major changes
- Test migrations in development first
- Use `git reset --soft` if unsure
- Keep database backups for at least 7 days

---

**Status:** Ready to execute  
**Risk Level:** Medium (with backup: Low)
