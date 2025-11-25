# Kết nối MySQL Workbench với Docker Database

## Thông tin kết nối

### Từ MySQL Workbench

1. **Mở MySQL Workbench**
2. **Click "MySQL Connections"** (dấu +) hoặc **Database → Manage Connections**
3. **Điền thông tin:**

```
Connection Name: TalkPlatform Docker
Hostname: localhost
Port: 3307
Username: talkuser
Password: talkpassword
Default Schema: talkplatform
```

4. **Click "Test Connection"** để kiểm tra
5. **Click "OK"** để lưu
6. **Double-click connection** để kết nối

## Thông tin chi tiết

### Connection Parameters

| Parameter | Value |
|-----------|-------|
| **Hostname** | `localhost` |
| **Port** | `3307` (đã đổi từ 3306 để tránh conflict) |
| **Username** | `talkuser` |
| **Password** | `talkpassword` |
| **Default Schema** | `talkplatform` |

### Root User (nếu cần)

| Parameter | Value |
|-----------|-------|
| **Username** | `root` |
| **Password** | `rootpassword` |

## Troubleshooting

### Lỗi "Can't connect to MySQL server"

1. **Kiểm tra Docker container đang chạy:**
   ```bash
   docker ps | grep mysql
   ```

2. **Kiểm tra port:**
   ```bash
   docker port talkplatform-mysql
   ```
   Kết quả: `0.0.0.0:3307->3306/tcp`

3. **Restart container nếu cần:**
   ```bash
   docker-compose restart mysql
   ```

### Lỗi "Access denied"

- Kiểm tra username/password đúng:
  - Username: `talkuser`
  - Password: `talkpassword`

### Không thấy database `talkplatform`

- Database đã được tạo tự động khi container start
- Nếu không có, tạo thủ công:
  ```sql
  CREATE DATABASE IF NOT EXISTS talkplatform;
  ```

## Sử dụng MySQL Workbench

### 1. Xem tất cả tables

```sql
SHOW TABLES;
```

### 2. Xem cấu trúc table

```sql
DESCRIBE users;
-- hoặc
SHOW COLUMNS FROM users;
```

### 3. Xem dữ liệu

```sql
SELECT * FROM users;
SELECT * FROM meetings;
SELECT * FROM global_chat_messages;
```

### 4. Tạo user test

```sql
-- Lưu ý: Password sẽ được hash tự động bởi backend
-- Nên dùng API register thay vì insert trực tiếp
```

## Alternative: phpMyAdmin (Web UI)

Nếu không muốn cài MySQL Workbench, có thể dùng phpMyAdmin:

1. **Truy cập:** http://localhost:8080
2. **Login:**
   - Server: `mysql` (tên service trong docker-compose)
   - Username: `talkuser`
   - Password: `talkpassword`

## Quick Test Connection

Test từ command line:

```bash
# Windows PowerShell
docker exec -it talkplatform-mysql mysql -u talkuser -ptalkpassword talkplatform -e "SHOW TABLES;"

# Hoặc
mysql -h localhost -P 3307 -u talkuser -ptalkpassword talkplatform
```

