# Migration sau khi đổi Port MySQL

## Câu trả lời ngắn gọn

**KHÔNG cần chạy lại migration** nếu:
- ✅ Database đã có data và tables
- ✅ Chỉ đổi port (3306 → 3307)
- ✅ Database vẫn là database cũ, chỉ kết nối qua port khác

**CẦN chạy migration** nếu:
- ❌ Database mới tạo (chưa có tables)
- ❌ Database bị xóa và tạo lại
- ❌ Có migration mới chưa chạy

## Trường hợp của bạn

Database trong Docker là **database mới**, nên cần chạy migration lần đầu:

```bash
cd talkplatform-backend

# 1. Cập nhật .env với port mới
DB_PORT=3307

# 2. Chạy migration
npm run migration:run
```

## Giải thích chi tiết

### Đổi port KHÔNG ảnh hưởng đến database

```
Port chỉ là "cửa vào" database, không phải database itself
┌─────────────┐
│   MySQL     │  ← Database (chứa data)
│   Server    │
└──────┬──────┘
       │
   ┌───┴───┐
   │ Port │  ← Chỉ là cửa vào (3306, 3307, ...)
   └───────┘
```

Khi đổi port:
- Database vẫn giữ nguyên
- Tables vẫn còn
- Data vẫn còn
- Chỉ cần cập nhật connection string

### Khi nào cần chạy migration?

1. **Database mới** (chưa có tables)
   ```bash
   # Cần chạy migration để tạo tables
   npm run migration:run
   ```

2. **Có migration mới** (chưa chạy)
   ```bash
   # Chạy migration mới
   npm run migration:run
   ```

3. **Database bị xóa** (mất data)
   ```bash
   # Cần chạy lại tất cả migrations
   npm run migration:run
   ```

## Cách kiểm tra

### 1. Kiểm tra database có tables chưa

```bash
docker exec -it talkplatform-mysql mysql -u talkuser -ptalkpassword talkplatform -e "SHOW TABLES;"
```

- **Có tables** → Không cần chạy migration
- **Không có tables** → Cần chạy migration

### 2. Kiểm tra migration đã chạy chưa

```bash
docker exec -it talkplatform-mysql mysql -u talkuser -ptalkpassword talkplatform -e "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"
```

- **Có records** → Migrations đã chạy
- **Table không tồn tại** → Chưa chạy migration

## Cập nhật .env

Sau khi đổi port, cập nhật `talkplatform-backend/.env`:

```env
# MySQL - Port mới
DB_HOST=localhost
DB_PORT=3307  # ← Đổi từ 3306 sang 3307
DB_USERNAME=talkuser
DB_PASSWORD=talkpassword
DB_DATABASE=talkplatform
```

## Tóm tắt

| Tình huống | Cần chạy migration? |
|------------|---------------------|
| Đổi port (database cũ) | ❌ KHÔNG |
| Database mới | ✅ CÓ |
| Có migration mới | ✅ CÓ |
| Database bị xóa | ✅ CÓ |

## Lệnh migration

```bash
cd talkplatform-backend

# Chạy tất cả migrations chưa chạy
npm run migration:run

# Xem migrations đã chạy
npm run migration:show

# Revert migration cuối cùng (cẩn thận!)
npm run migration:revert
```

