# MySQL Setup Instructions

## Quick Fix cho Error "Access denied for user 'root'@'localhost'"

### Option 1: Sử dụng MySQL mà không cần password (Development)
```bash
# Cập nhật .env file
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=talkplatform
```

### Option 2: Tạo user MySQL mới với password
```sql
-- Connect to MySQL as admin
mysql -u root -p

-- Tạo database
CREATE DATABASE talkplatform;

-- Tạo user mới
CREATE USER 'talkuser'@'localhost' IDENTIFIED BY 'talkpass123';

-- Grant quyền
GRANT ALL PRIVILEGES ON talkplatform.* TO 'talkuser'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

Sau đó cập nhật .env:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=talkuser
DB_PASSWORD=talkpass123
DB_DATABASE=talkplatform
```

### Option 3: Reset MySQL root password
```bash
# Dừng MySQL service
net stop mysql80

# Khởi động MySQL trong safe mode
mysqld --console --skip-grant-tables --skip-external-locking

# Trong terminal khác, connect to MySQL
mysql -u root

# Reset password
USE mysql;
UPDATE user SET authentication_string=PASSWORD("newpassword") WHERE User='root';
FLUSH PRIVILEGES;
EXIT;

# Restart MySQL service normally
net start mysql80
```

## Kiểm tra MySQL Connection
```bash
# Test connection
mysql -u root -p -h localhost

# Hoặc với user mới
mysql -u talkuser -p -h localhost
```

## Chạy Migrations sau khi fix
```bash
cd talkplatform-backend

# Kiểm tra connection
npm run migration:show

# Chạy migrations  
npm run migration:run
```