# Global Chat Architecture với Redis

## Tổng quan Kiến trúc

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Next.js App   │─────────▶│   NestJS Server  │─────────▶│    MySQL     │
│   (Frontend)    │ WebSocket│   (Backend)      │   REST   │  (Database)  │
└─────────────────┘          └──────────────────┘          └──────────────┘
                                      │
                                      │ Socket.IO
                                      │ Redis Adapter
                                      ▼
                              ┌──────────────┐
                              │    Redis     │
                              │  (Pub/Sub)   │
                              └──────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
              │ NestJS #1 │    │ NestJS #2 │    │ NestJS #3 │
              │ Instance  │    │ Instance  │    │ Instance  │
              └───────────┘    └───────────┘    └───────────┘
```

## Luồng dữ liệu (Data Flow)

### 1. Connection Flow

```
User → Next.js → Socket.IO Client
  → NestJS Gateway (handleConnection)
    → Verify User (optional)
    → Store in Redis (user-online, user-socket mapping)
    → Join 'global-chat-room'
    → Emit 'user:joined' (Redis adapter broadcasts to all instances)
```

### 2. Message Flow

```
User A (Server 1) → emit('chat:message')
  → NestJS Gateway (handleChatMessage)
    → Rate Limit Check (Redis)
    → Save to MySQL
    → Cache in Redis
    → server.to('global-chat-room').emit('chat:message')
      → Redis Adapter publishes to Redis
        → All NestJS instances receive from Redis
          → Broadcast to all connected clients
```

### 3. Disconnect Flow

```
User → Socket.IO disconnect
  → NestJS Gateway (handleDisconnect)
    → Remove from Redis (user-offline)
    → Emit 'user:left' (Redis adapter broadcasts)
```

## Redis Keys Structure

### Global Chat Keys

```
global-chat:user-online:{userId}          → { socketId, timestamp, online: true }
global-chat:user-socket:{socketId}        → userId
global-chat:online-users                  → Set of userIds
global-chat:message:{messageId}           → Cached message (TTL: 1h)
global-chat:rate-limit:{userId}           → Rate limit counter (TTL: 60s)
```

### Bandwidth Metrics Keys

```
bandwidth:metric:{timestamp}:{endpoint}   → Individual metric
bandwidth:realtime                         → Hash of aggregate metrics
bandwidth:timeseries:{endpoint}           → Sorted set (time-series)
```

## Scaling Strategy

### Single Instance (Development)

```
Next.js → NestJS (1 instance) → Redis → MySQL
```

### Multiple Instances (Production)

```
                    ┌─────────┐
                    │  Nginx  │ (Load Balancer with ip_hash)
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
   │ NestJS  │      │ NestJS  │     │ NestJS  │
   │   #1    │      │   #2    │     │   #3    │
   └────┬────┘      └────┬────┘     └────┬────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────▼────┐
                    │  Redis  │ (Pub/Sub Adapter)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  MySQL  │
                    └─────────┘
```

**Lưu ý quan trọng**: 
- Nginx phải dùng `ip_hash` để sticky session
- Redis Adapter tự động sync events giữa các instances

## Performance Optimizations

### 1. Message Caching

- Messages cached in Redis với TTL 1h
- Giảm load MySQL khi fetch recent messages

### 2. Rate Limiting

- Redis-based rate limiting (20 messages/minute)
- Prevents spam và abuse

### 3. Online Users Tracking

- Redis Set để track online users
- O(1) lookup time
- Cross-instance sync

### 4. Bandwidth Metrics

- Real-time metrics trong Redis
- Time-series data với sorted sets
- Aggregated metrics cho dashboard

## Error Handling

### Redis Connection Failure

- Socket.IO falls back to in-memory adapter
- System continues to work (single instance only)
- Logs warning message

### MySQL Connection Failure

- Messages cached in Redis temporarily
- Retry logic for persistence
- Graceful degradation

## Monitoring

### Redis Metrics

```bash
# Check online users
docker exec -it talkplatform-redis redis-cli
SMEMBERS global-chat:online-users

# Check realtime bandwidth
HGETALL bandwidth:realtime

# Monitor pub/sub
PUBSUB CHANNELS
```

### Application Logs

- Connection/disconnection events
- Message send/receive events
- Rate limit violations
- Redis connection status

## Best Practices

1. **Always set TTL** cho Redis keys để tránh memory leak
2. **Use Redis for real-time data**, MySQL for persistence
3. **Monitor Redis memory** usage
4. **Implement rate limiting** để prevent abuse
5. **Cache frequently accessed data** (messages, user status)

## Migration từ In-Memory sang Redis

### Before (Single Instance)

```typescript
// In-memory Map
private connectedUsers = new Map<string, Socket>();
```

### After (Multi-Instance with Redis)

```typescript
// Redis-based tracking
await redisService.setUserOnline(userId, socketId);
const onlineCount = await redisService.getOnlineUsersCount();
```

## Testing Multi-Instance Setup

### 1. Start Multiple Instances

```bash
# Terminal 1
PORT=3000 npm run start:dev

# Terminal 2
PORT=3001 npm run start:dev

# Terminal 3
PORT=3002 npm run start:dev
```

### 2. Test Cross-Instance Messaging

1. Connect client A to Server 1
2. Connect client B to Server 2
3. Send message from A
4. Verify B receives message (via Redis pub/sub)

### 3. Verify Redis Sync

```bash
docker exec -it talkplatform-redis redis-cli
PUBSUB CHANNELS
# Should see Socket.IO channels
```

## Troubleshooting

### Messages không sync giữa instances

1. Check Redis adapter:
   ```bash
   # Xem log khi start
   ✅ Redis IoAdapter configured for Socket.io
   ```

2. Check Redis connection:
   ```bash
   docker exec -it talkplatform-redis redis-cli PING
   ```

3. Check pub/sub channels:
   ```bash
   docker exec -it talkplatform-redis redis-cli
   PUBSUB CHANNELS
   ```

### High Memory Usage

1. Check Redis memory:
   ```bash
   docker exec -it talkplatform-redis redis-cli INFO memory
   ```

2. Check key count:
   ```bash
   docker exec -it talkplatform-redis redis-cli DBSIZE
   ```

3. Cleanup expired keys (automatic, but can force):
   ```bash
   docker exec -it talkplatform-redis redis-cli FLUSHDB
   ```

## Production Checklist

- [ ] Redis password set
- [ ] Redis persistence enabled (AOF)
- [ ] Redis memory limits configured
- [ ] Nginx sticky session enabled
- [ ] Monitoring setup (Redis metrics)
- [ ] Backup strategy (Redis + MySQL)
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Multi-instance tested


