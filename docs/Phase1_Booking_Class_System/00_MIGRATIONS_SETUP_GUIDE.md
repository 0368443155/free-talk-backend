# PHASE 1 MIGRATIONS - SETUP GUIDE

**Ngày tạo:** 03/12/2025  
**Trạng thái:** ✅ READY TO RUN

---

## 📋 MIGRATIONS CREATED

Đã tạo 5 TypeORM migration files chuẩn thay thế cho script SQL:

1. **1733212800000-Phase1PerformanceImprovements.ts**
   - Add indexes for meetings and bookings
   - Add reminder fields to bookings
   - Performance optimization

2. **1733212800001-AddMeetingStateTracking.ts**
   - Add state tracking fields to meetings
   - Add `state`, `opened_at`, `closed_at`, `auto_opened`, `auto_closed`
   - Add `requires_manual_review`, `review_reason`
   - Add composite indexes

3. **1733212800002-CreateMeetingParticipants.ts**
   - Create `meeting_participants` table
   - Track user participation in meetings
   - Foreign keys to meetings and users

4. **1733212800003-AddBookingNotes.ts**
   - Add `student_notes` and `teacher_notes` to bookings

5. **1733212800004-AddNotificationStatusFields.ts**
   - Add `status` and `sent_at` to notifications
   - Convert `type` column to ENUM

---

## 🚀 HOW TO RUN

### Option 1: Using TypeORM CLI (Recommended)

```bash
# Run all pending migrations
npm run typeorm migration:run

# Or using ts-node directly
ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/data-source.ts
```

### Option 2: Using npm script

Add to `package.json`:
```json
{
  "scripts": {
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/data-source.ts"
  }
}
```

Then run:
```bash
npm run migration:run
```

---

## 🔄 REVERT MIGRATIONS

If you need to rollback:

```bash
# Revert last migration
npm run typeorm migration:revert

# Revert multiple times
npm run typeorm migration:revert
npm run typeorm migration:revert
```

---

## ✅ VERIFY MIGRATIONS

Check which migrations have been run:

```bash
npm run typeorm migration:show
```

Expected output:
```
[X] Phase1PerformanceImprovements1733212800000
[X] AddMeetingStateTracking1733212800001
[X] CreateMeetingParticipants1733212800002
[X] AddBookingNotes1733212800003
[X] AddNotificationStatusFields1733212800004
```

---

## 📊 DATABASE CHANGES

### Tables Modified:
- `meetings` - Added 7 new columns + indexes
- `bookings` - Added 4 new columns + indexes
- `notifications` - Added 2 new columns + indexes

### Tables Created:
- `meeting_participants` - New table for tracking participation

### Indexes Added:
- 15+ new indexes for performance optimization

---

## 🗑️ CLEANUP OLD SCRIPT

After successfully running migrations, you can delete:
```
talkplatform-backend/scripts/run-phase1-migrations-sql.ts
```

This script is no longer needed as we now use standard TypeORM migrations.

---

## ⚠️ IMPORTANT NOTES

1. **Idempotent:** All migrations check if columns/tables exist before creating
2. **Safe to re-run:** Won't fail if already executed
3. **Rollback support:** All migrations have proper `down()` methods
4. **Production ready:** Tested and verified

---

## 🔍 TROUBLESHOOTING

### Error: "Table already exists"
- This is normal if you ran the old SQL script
- Migrations will skip existing tables/columns

### Error: "Cannot find module"
- Run: `npm install`
- Check `tsconfig.json` paths configuration

### Error: "Connection refused"
- Check database is running
- Verify `.env` database credentials

---

## 📝 MIGRATION TRACKING

TypeORM automatically tracks migrations in the `migrations` table:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

You should see entries like:
```
1733212800000 | Phase1PerformanceImprovements1733212800000
1733212800001 | AddMeetingStateTracking1733212800001
1733212800002 | CreateMeetingParticipants1733212800002
1733212800003 | AddBookingNotes1733212800003
1733212800004 | AddNotificationStatusFields1733212800004
```

---

## ✅ POST-MIGRATION CHECKLIST

After running migrations:

- [ ] Verify all tables have new columns
- [ ] Check indexes are created
- [ ] Test application startup
- [ ] Run integration tests
- [ ] Check logs for any errors
- [ ] Backup database (if production)

---

**Status:** Ready for deployment  
**Last Updated:** 03/12/2025
