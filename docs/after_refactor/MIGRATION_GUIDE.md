# Migration Guide - Feature Flags & Room Types

**Ngày tạo:** 2025-12-01  
**Mục đích:** Hướng dẫn chạy migrations cho feature flags và room_type

---

## 📋 Migrations Cần Chạy

Có **2 migrations** cần chạy để setup feature flags và room_type:

1. **`1766000000000-MapMeetingTypesToRoomTypes.ts`**
   - Thêm column `room_type` vào `meetings` table
   - Map existing `meeting_type` values sang `room_type`
   - Tạo index cho `room_type`

2. **`1766000000001-CreateFeatureFlags.ts`**
   - Tạo table `feature_flags`
   - Insert 5 default feature flags

---

## 🚀 Cách Chạy Migrations

### Option 1: Chạy Tất Cả Migrations Chưa Chạy

```bash
cd talkplatform-backend
npm run migration:run
```

### Option 2: Chạy Từng Migration Cụ Thể

```bash
# Chạy migration cho room_type
npm run migration:run -- -n MapMeetingTypesToRoomTypes1766000000000

# Chạy migration cho feature_flags
npm run migration:run -- -n CreateFeatureFlags1766000000001
```

### Option 3: Sử dụng TypeORM CLI

```bash
# Chạy tất cả pending migrations
npx typeorm migration:run -d data-source.ts

# Hoặc chỉ chạy một migration cụ thể
npx typeorm migration:run -d data-source.ts -n MapMeetingTypesToRoomTypes1766000000000
```

---

## 📊 Kiểm Tra Migrations Đã Chạy

### Xem danh sách migrations đã chạy:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;
```

### Kiểm tra table feature_flags:

```sql
SELECT * FROM feature_flags;
```

### Kiểm tra column room_type:

```sql
DESCRIBE meetings;
-- Hoặc
SHOW COLUMNS FROM meetings LIKE 'room_type';
```

---

## 🌱 Chạy Seed Data (Optional)

Sau khi chạy migrations, bạn có thể chạy seed data để populate feature flags:

```bash
npm run seed
```

Hoặc nếu muốn seed thủ công:

```typescript
import { runSeeds } from './src/database/seeds/run-seeds';
import { dataSource } from './data-source';

await dataSource.initialize();
await runSeeds(dataSource);
await dataSource.destroy();
```

---

## ⚠️ Lưu Ý

### 1. Backup Database Trước Khi Chạy

```bash
# Backup MySQL database
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql
```

### 2. Kiểm Tra Migration Status

```bash
# Xem migrations đã chạy
npm run migration:show

# Hoặc
npx typeorm migration:show -d data-source.ts
```

### 3. Rollback Nếu Cần

```bash
# Rollback migration cuối cùng
npm run migration:revert

# Hoặc rollback cụ thể
npx typeorm migration:revert -d data-source.ts -n CreateFeatureFlags1766000000001
```

---

## 📝 Migration Details

### Migration 1: MapMeetingTypesToRoomTypes

**Thay đổi:**
- Thêm column `room_type VARCHAR(50)` vào `meetings` table
- Map existing `meeting_type` values:
  - `free_talk` → `FREE_TALK`
  - `teacher_class` → `TEACHER_CLASS`
  - `workshop` → `WEBINAR`
  - `private_session` → `INTERVIEW`
- Tạo index `IDX_meetings_room_type`

**Impact:**
- ✅ Backward compatible (không xóa data)
- ✅ Safe to run (có check column exists)

### Migration 2: CreateFeatureFlags

**Thay đổi:**
- Tạo table `feature_flags` với columns:
  - `id` (VARCHAR(36), PRIMARY KEY)
  - `name` (VARCHAR(100), UNIQUE)
  - `enabled` (BOOLEAN, DEFAULT false)
  - `rollout_percentage` (INT, DEFAULT 0)
  - `description` (TEXT, NULLABLE)
  - `created_at`, `updated_at` (TIMESTAMP)
- Insert 5 default feature flags:
  - `use_new_gateway`
  - `use_room_factory`
  - `use_feature_modules`
  - `use_access_control`
  - `use_cqrs_pattern`

**Impact:**
- ✅ Safe to run (có check table exists)
- ✅ Idempotent (có thể chạy nhiều lần)

---

## ✅ Checklist

Trước khi chạy migrations:
- [ ] Backup database
- [ ] Kiểm tra database connection
- [ ] Review migration files
- [ ] Test trên staging environment trước

Sau khi chạy migrations:
- [ ] Verify `feature_flags` table created
- [ ] Verify `room_type` column added to `meetings`
- [ ] Check default feature flags inserted
- [ ] Test feature flag API endpoints
- [ ] Monitor application logs for errors

---

## 🔍 Troubleshooting

### Lỗi: "Table already exists"

**Giải pháp:** Migration có check `tableExists`, sẽ skip nếu table đã tồn tại. Đây là expected behavior.

### Lỗi: "Column already exists"

**Giải pháp:** Migration có check `hasRoomType`, sẽ skip nếu column đã tồn tại. Đây là expected behavior.

### Lỗi: "Cannot find module data-source"

**Giải pháp:** Đảm bảo bạn đang chạy từ root directory của project:
```bash
cd talkplatform-backend
npm run migration:run
```

### Lỗi: "UUID() function not found" (MySQL)

**Giải pháp:** Đã fix trong migration - sử dụng `REPLACE(UUID(), '-', '')` thay vì `UUID()`.

---

## 📚 Related Documents

- Feature Flags Guide: `docs/after_refactor/GRADUAL_ROLLOUT_PLAN.md`
- Frontend Update: `docs/after_refactor/FRONTEND_UPDATE_GUIDE.md`
- Refactor Progress: `docs/after_refactor/REFACTOR_PROGRESS_SUMMARY.md`

---

**Last Updated:** 2025-12-01

