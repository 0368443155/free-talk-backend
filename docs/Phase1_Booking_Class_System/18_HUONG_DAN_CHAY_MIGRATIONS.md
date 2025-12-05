# HƯỚNG DẪN KIỂM TRA VÀ CHẠY MIGRATIONS

**Ngày tạo:** 03/12/2025  
**Mục đích:** Hướng dẫn chi tiết cách kiểm tra và chạy migrations cho Phase 1

---

## 🚀 QUICK START

### Bước 1: Kiểm tra trạng thái migrations

```bash
cd talkplatform-backend
npm run migration:check
```

Script này sẽ:
- ✅ Kiểm tra kết nối database
- ✅ Kiểm tra migration tables
- ✅ Hiển thị trạng thái các migrations đã chạy
- ✅ Kiểm tra Phase 1 migrations
- ✅ Cảnh báo nếu có vấn đề

---

### Bước 2: Xem danh sách migrations

```bash
npm run migration:show
```

Lệnh này sẽ hiển thị:
- ✅ Các migrations đã chạy (marked with [X])
- ❌ Các migrations chưa chạy (marked with [ ])

---

### Bước 3: Chạy migrations

```bash
npm run migration:run
```

Lệnh này sẽ chạy tất cả các migrations chưa chạy.

---

## 📋 CHI TIẾT CÁC BƯỚC

### 1. Kiểm tra Migration Table

Trước khi chạy migrations, cần kiểm tra xem có vấn đề với migration table không.

#### Vấn đề phổ biến: 2 Migration Tables

Nếu có 2 migration tables (`migrations` và `migrations_typeorm`), cần merge chúng:

```sql
USE talkplatform;

-- Kiểm tra số lượng tables
SHOW TABLES LIKE 'migration%';

-- Kiểm tra số lượng records trong mỗi table
SELECT COUNT(*) as count_migrations FROM migrations;
SELECT COUNT(*) as count_migrations_typeorm FROM migrations_typeorm;

-- Nếu có 2 tables, merge chúng:
INSERT IGNORE INTO migrations (id, timestamp, name)
SELECT id, timestamp, name FROM migrations_typeorm;

-- Sau đó xóa table cũ
DROP TABLE IF EXISTS migrations_typeorm;

-- Verify
SELECT COUNT(*) as total_migrations FROM migrations;
```

**File SQL có sẵn:**
- `docs/Phase1_Booking_Class_System/Fix_Phase_1/merge_migrations_correct.sql`

---

### 2. Kiểm tra Trạng thái Migrations

#### Sử dụng Script Helper

```bash
npm run migration:check
```

Script này sẽ tự động:
- Kiểm tra kết nối database
- Kiểm tra migration tables
- Hiển thị trạng thái Phase 1 migrations
- Cảnh báo nếu có vấn đề

#### Sử dụng TypeORM CLI

```bash
npm run migration:show
```

---

### 3. Chạy Migrations

#### Chạy tất cả migrations chưa chạy

```bash
npm run migration:run
```

#### Chạy migration cụ thể (nếu cần)

```bash
npm run typeorm migration:run -d data-source.ts -n Phase1PerformanceImprovements1733212800000
```

---

### 4. Revert Migration (nếu cần)

Nếu muốn rollback migration cuối cùng:

```bash
npm run migration:revert
```

**⚠️ Cảnh báo:** Chỉ revert khi thực sự cần thiết!

---

## 📊 PHASE 1 MIGRATIONS

### Danh sách Phase 1 Migrations

1. **1733212800000-Phase1PerformanceImprovements.ts**
   - Add indexes cho meetings và bookings
   - Add reminder fields to bookings

2. **1733212800001-AddMeetingStateTracking.ts**
   - Add state tracking fields to meetings
   - Add `state`, `opened_at`, `closed_at`, `auto_opened`, `auto_closed`

3. **1733212800002-CreateMeetingParticipants.ts**
   - Create `meeting_participants` table

4. **1733212800003-AddBookingNotes.ts**
   - Add `student_notes` and `teacher_notes` to bookings

5. **1733212800004-AddNotificationStatusFields.ts**
   - Add `status` and `sent_at` to notifications

6. **1733213400000-Phase1AutoScheduleFields.ts**
   - Add auto schedule fields to meetings

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Cannot connect to database"

**Nguyên nhân:** Database không chạy hoặc config sai

**Giải pháp:**
1. Kiểm tra MySQL đang chạy:
   ```bash
   # Windows
   net start MySQL80
   
   # Linux/Mac
   sudo systemctl start mysql
   ```

2. Kiểm tra file `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=talkplatform
   ```

---

### Lỗi: "Migration table does not exist"

**Nguyên nhân:** Migration table chưa được tạo

**Giải pháp:**
TypeORM sẽ tự động tạo table khi chạy migration đầu tiên. Không cần làm gì.

---

### Lỗi: "Multiple migration tables found"

**Nguyên nhân:** Có 2 migration tables

**Giải pháp:**
Xem phần "1. Kiểm tra Migration Table" ở trên để merge tables.

---

### Lỗi: "Migration already executed"

**Nguyên nhân:** Migration đã được chạy trước đó

**Giải pháp:**
Đây không phải lỗi, chỉ là cảnh báo. Migration sẽ được skip.

---

### Lỗi: "Column already exists"

**Nguyên nhân:** Column đã được tạo từ migration trước đó

**Giải pháp:**
1. Kiểm tra xem column đã tồn tại chưa:
   ```sql
   DESCRIBE table_name;
   ```

2. Nếu đã tồn tại, có thể:
   - Mark migration as executed (nếu đúng là đã chạy)
   - Hoặc sửa migration file để check column trước khi tạo

---

## ✅ VERIFICATION

Sau khi chạy migrations, kiểm tra:

### 1. Kiểm tra Migration Records

```sql
SELECT * FROM migrations 
WHERE name LIKE '%Phase1%' 
ORDER BY timestamp;
```

### 2. Kiểm tra Database Columns

```sql
-- Kiểm tra meetings table
DESCRIBE meetings;
-- Should see: meeting_state, auto_opened_at, auto_closed_at, etc.

-- Kiểm tra bookings table
DESCRIBE bookings;
-- Should see: reminder_sent_20min, reminder_sent_at, etc.

-- Kiểm tra notifications table
DESCRIBE notifications;
-- Should see: status, sent_at, etc.
```

### 3. Kiểm tra Indexes

```sql
SHOW INDEXES FROM meetings;
SHOW INDEXES FROM bookings;
```

---

## 📝 CHECKLIST

Trước khi chạy migrations:

- [ ] Database đang chạy
- [ ] File `.env` đúng config
- [ ] Backup database (nếu production)
- [ ] Đã kiểm tra migration tables (nếu có vấn đề)

Sau khi chạy migrations:

- [ ] Tất cả migrations đã chạy (check với `migration:show`)
- [ ] Database columns đã được tạo
- [ ] Indexes đã được tạo
- [ ] Không có lỗi trong logs

---

## 🎯 QUICK COMMANDS SUMMARY

```bash
# Kiểm tra trạng thái
npm run migration:check

# Xem danh sách migrations
npm run migration:show

# Chạy migrations
npm run migration:run

# Revert migration cuối (nếu cần)
npm run migration:revert
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. **Kiểm tra logs:** Xem error message chi tiết
2. **Xem tài liệu:** 
   - `docs/Phase1_Booking_Class_System/Fix_Phase_1/`
   - `docs/Phase1_Booking_Class_System/00_MIGRATIONS_SETUP_GUIDE.md`
3. **Check database:** Verify database connection và permissions

---

**Created by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0


