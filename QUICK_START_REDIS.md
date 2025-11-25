# Quick Start: Redis Setup cho Global Chat

## Bước 1: Khởi động Redis và MySQL

```bash
# Từ thư mục root của project
docker-compose up -d redis mysql
```

## Bước 2: Kiểm tra Services

```bash
# Kiểm tra Redis
docker exec -it talkplatform-redis redis-cli PING
# Kết quả: PONG

# Kiểm tra MySQL
docker exec -it talkplatform-mysql mysqladmin -u root -prootpassword ping
# Kết quả: mysqld is alive
```

## Bước 3: Cấu hình Environment Variables

Thêm vào `talkplatform-backend/.env`:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MySQL (nếu chưa có)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=talkuser
DB_PASSWORD=talkpassword
DB_DATABASE=talkplatform
```

## Bước 4: Start Backend

```bash
cd talkplatform-backend
npm run start:dev
```

Bạn sẽ thấy log:
```
✅ Connected to Redis at localhost:6379
✅ Redis IoAdapter created successfully
✅ Socket.IO server configured with Redis adapter - Ready for horizontal scaling
```

## Bước 5: Test Global Chat

1. Mở dashboard: http://localhost:3001
2. Global chat sẽ tự động kết nối
3. Gửi tin nhắn test

## Kiểm tra Redis đang hoạt động

```bash
# Xem online users
docker exec -it talkplatform-redis redis-cli
SMEMBERS global-chat:online-users

# Xem cached messages
KEYS global-chat:message:*

# Xem bandwidth metrics
HGETALL bandwidth:realtime
```

## Troubleshooting

### Redis không kết nối

1. Kiểm tra container:
   ```bash
   docker ps | grep redis
   ```

2. Xem logs:
   ```bash
   docker logs talkplatform-redis
   ```

3. Restart:
   ```bash
   docker-compose restart redis
   ```

### Backend không kết nối Redis

1. Kiểm tra .env có đúng config không
2. Kiểm tra Redis đang chạy: `docker ps | grep redis`
3. Test connection: `docker exec -it talkplatform-redis redis-cli PING`

## Next Steps

- Xem `REDIS_SETUP.md` để hiểu chi tiết về Redis
- Xem `REDIS_GLOBAL_CHAT_ARCHITECTURE.md` để hiểu kiến trúc
- Xem `DOCKER_SETUP.md` để hiểu về Docker setup


