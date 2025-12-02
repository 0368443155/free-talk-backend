# Hướng dẫn chạy Test Script cho Phase 1 Metrics

## Cách 1: Sử dụng npm script (Khuyến nghị)

```bash
npm run test:metrics
```

## Cách 2: Chạy trực tiếp với ts-node

```bash
ts-node -r tsconfig-paths/register scripts/test-metrics-phase1.ts
```

## Cách 3: Chạy với environment variables

```bash
# Set API URL (nếu khác localhost:3000)
API_URL=http://localhost:3000 npm run test:metrics

# Set Admin Token (nếu cần test các endpoint có auth)
ADMIN_TOKEN=your_admin_token_here npm run test:metrics

# Hoặc cả hai
API_URL=http://localhost:3000 ADMIN_TOKEN=your_token npm run test:metrics
```

## Yêu cầu trước khi chạy:

1. **Server phải đang chạy:**
   ```bash
   npm run start:dev
   ```

2. **Redis phải đang chạy:**
   ```bash
   # Kiểm tra Redis
   redis-cli ping
   # Nếu chưa chạy, start Redis:
   # Windows: redis-server
   # Docker: docker-compose up -d redis
   ```

3. **MySQL phải kết nối được:**
   - Kiểm tra file `.env` có đúng DB credentials

## Kết quả mong đợi:

Script sẽ:
1. ✅ Gửi một request test đến API
2. ⏳ Đợi 6 giây để worker xử lý metrics
3. 📊 Kiểm tra buffer status
4. 📈 Kiểm tra real-time metrics
5. 📅 Kiểm tra hourly metrics

## Troubleshooting:

### Lỗi: Cannot find module 'axios'
```bash
npm install axios
```

### Lỗi: Connection refused
- Kiểm tra server có đang chạy không: `npm run start:dev`
- Kiểm tra PORT trong `.env` có đúng không

### Lỗi: 401 Unauthorized
- Các endpoint `/metrics/*` cần admin token
- Set `ADMIN_TOKEN` environment variable hoặc bỏ qua (script sẽ skip các endpoint cần auth)

### Không thấy metrics
- Đợi ít nhất 6 giây sau khi gửi request
- Kiểm tra Redis: `redis-cli LLEN metrics:buffer`
- Kiểm tra logs của server xem có lỗi không


