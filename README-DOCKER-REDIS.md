# Docker & Redis Setup Guide

## 🐳 Docker Compose Setup

### 1. Khởi động services

```bash
# Start MySQL và Redis
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop và xóa volumes (xóa dữ liệu)
docker-compose down -v
```

### 2. Services được tạo

- **MySQL**: `localhost:3306`
  - Database: `talkplatform`
  - User: `talkuser`
  - Password: `talkpassword` (cấu hình trong .env)
  - Web UI: http://localhost:8080 (phpMyAdmin)

- **Redis**: `localhost:6379`
  - Web UI: http://localhost:8081 (Redis Commander)
  - Không có password mặc định (có thể cấu hình trong docker/redis/redis.conf)

### 3. Cấu hình .env

Tạo file `.env` trong `talkplatform-backend/`:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=talkuser
DB_PASSWORD=talkpassword
DB_DATABASE=talkplatform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🔄 Redis IoAdapter cho Socket.io

### Cách hoạt động

1. **Single Instance**: Socket.io hoạt động bình thường với in-memory adapter
2. **Multiple Instances**: Khi có nhiều NestJS instances:
   - Instance A emit event → Redis publish
   - Redis broadcast → Tất cả instances nhận
   - Mỗi instance emit đến clients của nó

### Kiểm tra Redis Adapter

```bash
# Xem logs khi start NestJS
# Sẽ thấy: "✅ Redis IoAdapter initialized successfully"

# Nếu không thấy, kiểm tra:
# 1. Redis đang chạy: docker-compose ps
# 2. Connection string trong .env
# 3. Redis logs: docker-compose logs redis
```

## 📊 Redis cho Global Chat

### Features sử dụng Redis

1. **Online Users Tracking**
   - Key: `global-chat:online-users` (Set)
   - Lưu danh sách userId đang online
   - Sync giữa các instances

2. **User-Socket Mapping**
   - Key: `global-chat:user-socket:{userId}`
   - Map userId → socketId
   - TTL: 1 hour

3. **Message Caching**
   - Key: `global-chat:messages:{messageId}`
   - Cache tin nhắn để truy xuất nhanh
   - TTL: 1 hour

4. **Rate Limiting**
   - Key: `global-chat:rate-limit:{userId}`
   - Giới hạn 20 messages/phút
   - TTL: 60 seconds

## 🚀 Scaling với Multiple Instances

### Chạy nhiều NestJS instances

```bash
# Terminal 1
PORT=3000 npm run start:dev

# Terminal 2
PORT=3001 npm run start:dev

# Terminal 3
PORT=3002 npm run start:dev
```

### Test cross-instance messaging

1. Connect client A đến instance 1 (port 3000)
2. Connect client B đến instance 2 (port 3001)
3. Client A gửi tin nhắn → Client B sẽ nhận được (nhờ Redis adapter)

## 🔍 Monitoring Redis

### Redis Commander (Web UI)

- URL: http://localhost:8081
- Xem tất cả keys, values, TTL
- Test commands

### Redis CLI

```bash
# Vào Redis container
docker exec -it talkplatform-redis redis-cli

# Xem keys
KEYS global-chat:*

# Xem online users
SMEMBERS global-chat:online-users

# Xem user socket mapping
GET global-chat:user-socket:{userId}

# Xem rate limit
GET global-chat:rate-limit:{userId}
TTL global-chat:rate-limit:{userId}
```

## 📈 Bandwidth Monitoring với Redis

Redis có thể được sử dụng để:
- Cache bandwidth metrics
- Aggregate metrics từ nhiều instances
- Real-time dashboard updates

## ⚠️ Troubleshooting

### Redis không kết nối được

1. Kiểm tra Redis đang chạy:
   ```bash
   docker-compose ps
   ```

2. Test connection:
   ```bash
   docker exec -it talkplatform-redis redis-cli ping
   # Should return: PONG
   ```

3. Kiểm tra logs:
   ```bash
   docker-compose logs redis
   ```

### Socket.io không dùng Redis adapter

1. Kiểm tra logs khi start NestJS
2. Nếu thấy "⚠️ Redis adapter not available" → Redis chưa kết nối
3. Kiểm tra .env có đúng REDIS_HOST, REDIS_PORT không

### Cross-instance messages không hoạt động

1. Đảm bảo cả 2 instances đều kết nối Redis thành công
2. Kiểm tra Redis adapter logs
3. Test với Redis Commander xem có events được publish không

## 📝 Next Steps

1. ✅ Docker Compose với MySQL + Redis
2. ✅ Redis IoAdapter cho Socket.io
3. ✅ Global Chat với Redis
4. 🔄 Bandwidth Monitoring với Redis (optional)
5. 🔄 Replace LiveKit với WebRTC + Redis (optional, phức tạp)

