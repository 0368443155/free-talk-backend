# 🗑️ DATABASE CLEANUP GUIDE

**Date**: 2025-12-02  
**Purpose**: Remove old metrics tables and create new optimized ones

---

## 📊 CURRENT STATE

Bạn hiện có **3 bảng metrics cũ** chưa sử dụng:

1. ✅ `bandwidth_metrics` - Bảng cũ
2. ✅ `metrics_hourly` - Bảng cũ (cấu trúc khác)
3. ✅ `livekit_metrics` - Bảng cũ

**Cần làm**: Xóa hết và tạo lại theo strategy mới

---

## 🎯 NEW STRATEGY TABLES

Sẽ tạo **3 bảng mới** theo strategy đã optimize:

1. ✅ `metrics_hourly` - Hourly aggregates (optimized)
2. ✅ `metrics_daily` - Daily aggregates
3. ✅ `bandwidth_alerts` - Alert system

---

## 🚀 OPTION 1: Using TypeORM Migration (Recommended)

### Step 1: Check Current Migrations
```bash
cd talkplatform-backend

# List all migrations
npm run typeorm migration:show
```

### Step 2: Run Cleanup Migration
```bash
# Run the cleanup migration
npm run typeorm migration:run

# This will:
# - Drop old tables: livekit_metrics, bandwidth_metrics, metrics_hourly (old)
# - Create new tables: metrics_hourly (new), metrics_daily, bandwidth_alerts
```

### Step 3: Verify
```bash
# Connect to MySQL
mysql -u root -p

# Use your database
USE your_database_name;

# Show all metrics tables
SHOW TABLES LIKE '%metrics%';

# Should show:
# - bandwidth_alerts
# - metrics_daily
# - metrics_hourly

# Check structure
DESCRIBE metrics_hourly;
DESCRIBE metrics_daily;
DESCRIBE bandwidth_alerts;
```

---

## 🚀 OPTION 2: Using SQL Script (Direct)

### Step 1: Backup (Optional but Recommended)
```bash
# Backup current database
mysqldump -u root -p your_database_name > backup_before_cleanup.sql

# Or backup only metrics tables
mysqldump -u root -p your_database_name \
  bandwidth_metrics \
  metrics_hourly \
  livekit_metrics \
  > metrics_backup.sql
```

### Step 2: Run SQL Script
```bash
# Connect to MySQL
mysql -u root -p

# Use your database
USE your_database_name;

# Run the cleanup script
source /path/to/talkplatform-backend/scripts/cleanup-metrics-tables.sql;

# Or copy-paste the SQL content directly
```

### Step 3: Verify
```sql
-- Show all metrics tables
SHOW TABLES LIKE '%metrics%';

-- Check row counts (should be 0 for new tables)
SELECT COUNT(*) FROM metrics_hourly;
SELECT COUNT(*) FROM metrics_daily;
SELECT COUNT(*) FROM bandwidth_alerts;

-- Check indexes
SHOW INDEX FROM metrics_hourly;
```

---

## 📋 VERIFICATION CHECKLIST

After running migration, verify:

### ✅ Old Tables Dropped
```sql
-- These should NOT exist
SHOW TABLES LIKE 'livekit_metrics';
SHOW TABLES LIKE 'bandwidth_metrics';
```

### ✅ New Tables Created
```sql
-- These SHOULD exist
SHOW TABLES LIKE 'metrics_hourly';
SHOW TABLES LIKE 'metrics_daily';
SHOW TABLES LIKE 'bandwidth_alerts';
```

### ✅ Correct Structure

**metrics_hourly** should have:
- Columns: id, endpoint, method, protocol, hour_start, total_requests, total_inbound, total_outbound, avg_response_time, max_response_time, min_response_time, error_count, success_count, created_at, updated_at
- Indexes: idx_endpoint_hour (UNIQUE), idx_hour_start, idx_protocol

**metrics_daily** should have:
- Columns: id, date, protocol, total_bandwidth, total_requests, avg_response_time, peak_bandwidth, peak_hour, unique_users, created_at
- Indexes: idx_date_protocol (UNIQUE), idx_date

**bandwidth_alerts** should have:
- Columns: id, alert_type, severity, message, metric_value, threshold_value, endpoint, protocol, created_at, resolved_at
- Indexes: idx_created, idx_severity, idx_protocol

---

## 🔄 ROLLBACK (If Needed)

### If using TypeORM Migration:
```bash
# Revert the migration
npm run typeorm migration:revert
```

### If using SQL Script:
```bash
# Restore from backup
mysql -u root -p your_database_name < backup_before_cleanup.sql
```

---

## ⚠️ IMPORTANT NOTES

### 1. Data Loss Warning
- ❌ **Old data will be DELETED**
- ✅ Backup first if you need old data
- ✅ Old tables were not being used anyway

### 2. No Downtime Required
- ✅ Old tables are not in use
- ✅ New tables will be empty
- ✅ Safe to run anytime

### 3. Next Steps After Cleanup
1. ✅ Verify tables created correctly
2. ✅ Start Phase 1 implementation
3. ✅ Middleware will start populating data
4. ✅ Bull worker will aggregate data

---

## 🎯 QUICK COMMAND REFERENCE

### Check Database
```bash
mysql -u root -p -e "USE your_db; SHOW TABLES LIKE '%metrics%';"
```

### Run Migration
```bash
cd talkplatform-backend
npm run typeorm migration:run
```

### Verify Tables
```bash
mysql -u root -p -e "USE your_db; DESCRIBE metrics_hourly;"
```

### Check Indexes
```bash
mysql -u root -p -e "USE your_db; SHOW INDEX FROM metrics_hourly;"
```

---

## 📊 EXPECTED RESULT

### Before Cleanup:
```
Tables:
- bandwidth_metrics (old, unused)
- metrics_hourly (old, wrong structure)
- livekit_metrics (old, unused)
```

### After Cleanup:
```
Tables:
- metrics_hourly (new, optimized structure)
- metrics_daily (new)
- bandwidth_alerts (new)

All tables: Empty, ready for Phase 1
```

---

## 🚀 READY TO PROCEED?

**Choose your method:**

### Method 1: TypeORM Migration (Recommended)
```bash
cd talkplatform-backend
npm run typeorm migration:run
```

### Method 2: Direct SQL
```bash
mysql -u root -p your_database_name < scripts/cleanup-metrics-tables.sql
```

**After cleanup, you're ready to start Phase 1!** 🎉

---

**Files Created:**
1. `src/database/1733112000000-cleanup-metrics-tables.ts` - TypeORM migration
2. `scripts/cleanup-metrics-tables.sql` - SQL script
3. `DATABASE_CLEANUP_GUIDE.md` - This guide

**Next**: Run cleanup → Verify → Start Phase 1 implementation
