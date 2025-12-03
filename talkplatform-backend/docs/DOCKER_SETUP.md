# Docker Setup Guide for TalkPlatform

## Tổng quan

TalkPlatform sử dụng Docker Compose để chạy MySQL và Redis trong môi trường development và production.

## Services trong Docker Compose

### 1. MySQL Database
- **Image**: `mysql:8.0`
- **Port**: `3306` (mapped từ env `DB_PORT`)
- **Database**: `talkplatform` (từ env `DB_DATABASE`)
- **User**: `talkuser` (từ env `DB_USERNAME`)
- **Password**: `talkpassword` (từ env `DB_PASSWORD`)

### 2. Redis Cache & Pub/Sub
- **Image**: `redis:7-alpine`
- **Port**: `6379` (mapped từ env `REDIS_PORT`)
- **Config**: `docker/redis/redis.conf`
- **Persistence**: AOF (Append Only File) enabled

### 3. Redis Commander (Optional)
- **Image**: `rediscommander/redis-commander:latest`
- **Port**: `8081`
- **URL**: http://localhost:8081
- **Mục đích**: Web UI để quản lý Redis

### 4. phpMyAdmin (Optional)
- **Image**: `phpmyadmin/phpmyadmin:latest`
- **Port**: `8080`
- **URL**: http://localhost:8080
- **Mục đích**: Web UI để quản lý MySQL

## Cài đặt và Khởi động

### 1. Khởi động tất cả services

```bash
# Từ thư mục root của project
docker-compose up -d
```

### 2. Khởi động chỉ MySQL và Redis

```bash
docker-compose up -d mysql redis
```

### 3. Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ Redis
docker-compose logs -f redis

# Chỉ MySQL
docker-compose logs -f mysql
```

### 4. Dừng services

```bash
docker-compose down
```

### 5. Dừng và xóa volumes (xóa dữ liệu)

```bash
docker-compose down -v
```

## Environment Variables

Tạo file `.env` trong thư mục root (nếu chưa có):

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=talkuser
DB_PASSWORD=talkpassword
DB_DATABASE=talkplatform
DB_ROOT_PASSWORD=rootpassword

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Kiểm tra Services

### 1. Kiểm tra MySQL

```bash
# Kiểm tra container đang chạy
docker ps | grep mysql

# Kết nối MySQL
docker exec -it talkplatform-mysql mysql -u talkuser -ptalkpassword talkplatform

# Hoặc từ host
mysql -h localhost -P 3306 -u talkuser -ptalkpassword talkplatform
```

### 2. Kiểm tra Redis

```bash
# Kiểm tra container đang chạy
docker ps | grep redis

# Kết nối Redis CLI
docker exec -it talkplatform-redis redis-cli

# Test ping
docker exec -it talkplatform-redis redis-cli PING
# Kết quả: PONG
```

## Cấu hình Redis

File cấu hình: `docker/redis/redis.conf`

**Các tính năng đã bật**:
- **AOF Persistence**: Lưu tất cả write commands
- **Memory Management**: `maxmemory-policy allkeys-lru`
- **Slow Log**: Log các commands chậm > 10ms

## Backup và Restore

### MySQL Backup

```bash
# Backup
docker exec talkplatform-mysql mysqldump -u talkuser -ptalkpassword talkplatform > backup.sql

# Restore
docker exec -i talkplatform-mysql mysql -u talkuser -ptalkpassword talkplatform < backup.sql
```

### Redis Backup

```bash
# Redis tự động lưu AOF và RDB vào volume
# Backup volume
docker run --rm -v talkplatform-free-talk_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Restore volume
docker run --rm -v talkplatform-free-talk_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /
```

## Troubleshooting

### MySQL không kết nối được

1. Kiểm tra container:
   ```bash
   docker ps | grep mysql
   ```

2. Kiểm tra logs:
   ```bash
   docker logs talkplatform-mysql
   ```

3. Kiểm tra port:
   ```bash
   docker port talkplatform-mysql
   ```

### Redis không kết nối được

1. Kiểm tra container:
   ```bash
   docker ps | grep redis
   ```

2. Kiểm tra logs:
   ```bash
   docker logs talkplatform-redis
   ```

3. Test connection:
   ```bash
   docker exec -it talkplatform-redis redis-cli PING
   ```

### Port đã được sử dụng

Nếu port 3306 hoặc 6379 đã được sử dụng, thay đổi trong `.env`:

```env
DB_PORT=3307
REDIS_PORT=6380
```

Sau đó restart:
```bash
docker-compose down
docker-compose up -d
```

## Production Deployment

### 1. Sử dụng Docker Compose trong Production

```bash
# Build và start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2. Sử dụng Docker Swarm hoặc Kubernetes

- **Docker Swarm**: Sử dụng `docker stack deploy`
- **Kubernetes**: Tạo manifests từ docker-compose

### 3. Security Considerations

1. **Set Redis Password**:
   ```env
   REDIS_PASSWORD=your_strong_password
   ```

2. **Set MySQL Root Password**:
   ```env
   DB_ROOT_PASSWORD=your_strong_password
   ```

3. **Restrict Network Access**:
   - Chỉ expose ports cần thiết
   - Sử dụng Docker networks để isolate services

4. **Backup Regularly**:
   - Setup cron job để backup MySQL và Redis

## Monitoring

### 1. Container Stats

```bash
docker stats talkplatform-mysql talkplatform-redis
```

### 2. MySQL Status

```bash
docker exec -it talkplatform-mysql mysqladmin -u root -prootpassword status
```

### 3. Redis Info

```bash
docker exec -it talkplatform-redis redis-cli INFO
```

## Cleanup

### Xóa tất cả containers và volumes

```bash
docker-compose down -v
docker system prune -a
```

**Cảnh báo**: Lệnh này sẽ xóa TẤT CẢ dữ liệu!


