# Redis Setup Guide for TalkPlatform

## Tổng quan

Redis được sử dụng trong TalkPlatform cho 2 mục đích chính:
1. **Socket.IO Adapter**: Đồng bộ Socket.IO events giữa nhiều instance NestJS (horizontal scaling)
2. **Caching & Real-time Data**: Cache messages, store online users, rate limiting, bandwidth metrics

## Cấu hình Docker

### 1. Khởi động Redis và MySQL

```bash
# Từ thư mục root của project
docker-compose up -d redis mysql
```

### 2. Kiểm tra Redis đang chạy

```bash
docker ps | grep redis
docker exec -it talkplatform-redis redis-cli ping
# Kết quả: PONG
```

## Cấu hình Environment Variables

Thêm vào file `.env` của backend:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MySQL Configuration (nếu chưa có)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=talkuser
DB_PASSWORD=talkpassword
DB_DATABASE=talkplatform
```

## Kiến trúc Redis trong TalkPlatform

### 1. Socket.IO Redis Adapter

**File**: `src/core/adapters/redis-io.adapter.ts`

- **Mục đích**: Cho phép nhiều instance NestJS chia sẻ Socket.IO connections
- **Cơ chế**: Khi một instance emit event, Redis sẽ broadcast đến tất cả instances khác
- **Lợi ích**: Scale horizontal (chạy nhiều server)

**Cách hoạt động**:
```
User A (Server 1) → emit('chat:message') 
  → Redis Pub/Sub 
    → Server 1, Server 2, Server 3 nhận event
      → Broadcast đến tất cả clients
```

### 2. Global Chat Redis Service

**File**: `src/features/global-chat/services/global-chat-redis.service.ts`

**Redis Keys được sử dụng**:
- `global-chat:user-online:{userId}` - Trạng thái online của user
- `global-chat:user-socket:{socketId}` - Mapping socketId → userId
- `global-chat:online-users` - Set chứa tất cả user IDs đang online
- `global-chat:message:{messageId}` - Cache tin nhắn (TTL: 1h)
- `global-chat:rate-limit:{userId}` - Rate limiting cho chat

**Chức năng**:
- Track online/offline users (cross-instance)
- Cache messages để truy xuất nhanh
- Rate limiting (20 messages/minute)
- Online users count

### 3. Bandwidth Redis Service

**File**: `src/metrics/services/bandwidth-redis.service.ts`

**Redis Keys được sử dụng**:
- `bandwidth:metric:{timestamp}:{endpoint}` - Individual metrics
- `bandwidth:realtime` - Hash chứa aggregate metrics
- `bandwidth:timeseries:{endpoint}` - Sorted set cho time-series data

**Chức năng**:
- Real-time bandwidth metrics caching
- Time-series data storage (24h rolling window)
- Aggregated metrics for dashboard

## Testing Redis Connection

### 1. Test từ NestJS

Khi start backend, bạn sẽ thấy log:
```
✅ Connected to Redis at localhost:6379
✅ Redis IoAdapter created successfully
✅ Socket.IO server configured with Redis adapter
```

### 2. Test từ Redis CLI

```bash
docker exec -it talkplatform-redis redis-cli

# Kiểm tra keys
KEYS global-chat:*

# Xem online users
SMEMBERS global-chat:online-users

# Xem realtime metrics
HGETALL bandwidth:realtime
```

## Scaling với Multiple Instances

### 1. Chạy nhiều instance NestJS

```bash
# Terminal 1
PORT=3000 npm run start:dev

# Terminal 2
PORT=3001 npm run start:dev

# Terminal 3
PORT=3002 npm run start:dev
```

### 2. Load Balancer (Nginx)

```nginx
upstream backend {
    ip_hash; # Sticky session cho Socket.IO
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Lưu ý**: `ip_hash` là bắt buộc để Socket.IO handshake không bị lỗi 400.

## Monitoring Redis

### 1. Redis Commander (Web UI)

Truy cập: http://localhost:8081

### 2. Redis CLI Commands

```bash
# Xem tất cả keys
KEYS *

# Xem memory usage
INFO memory

# Xem connected clients
CLIENT LIST

# Monitor real-time commands
MONITOR
```

## Troubleshooting

### Redis không kết nối được

1. Kiểm tra Redis đang chạy:
   ```bash
   docker ps | grep redis
   ```

2. Kiểm tra port:
   ```bash
   docker port talkplatform-redis
   ```

3. Kiểm tra logs:
   ```bash
   docker logs talkplatform-redis
   ```

### Socket.IO không sync giữa instances

1. Kiểm tra Redis adapter đã được cấu hình:
   - Xem log khi start: `✅ Redis IoAdapter created successfully`

2. Kiểm tra Redis connection:
   ```bash
   docker exec -it talkplatform-redis redis-cli PING
   ```

3. Kiểm tra pub/sub channels:
   ```bash
   docker exec -it talkplatform-redis redis-cli
   PUBSUB CHANNELS
   ```

## Best Practices

1. **TTL cho keys**: Luôn set TTL để tránh memory leak
2. **Connection pooling**: Redis client tự động quản lý connection pool
3. **Error handling**: Luôn có fallback khi Redis fail
4. **Monitoring**: Monitor Redis memory usage và connection count

## Production Considerations

1. **Redis Persistence**: Đã cấu hình AOF (Append Only File) trong `docker/redis/redis.conf`
2. **Redis Password**: Nên set password trong production
3. **Redis Cluster**: Cân nhắc Redis Cluster cho high availability
4. **Memory Limits**: Set `maxmemory` và `maxmemory-policy` trong production


