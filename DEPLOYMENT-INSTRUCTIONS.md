# Hướng dẫn Triển khai Admin Dashboard

## ✅ Đã Hoàn thành

### Backend (NestJS)
- ✅ Tối ưu hóa Connection Pooling MySQL với TypeORM
- ✅ Entities: `BandwidthMetric`, `MetricsHourly` theo kỹ thuật tách biệt dữ liệu
- ✅ Event Bus Pattern với RxJS Subject trong `AppService`
- ✅ WebSocket Gateway cho real-time communication
- ✅ Scheduled Tasks cho data aggregation và system metrics
- ✅ Metrics API endpoints với proper authentication
- ✅ Database migrations cho bandwidth tracking tables
- ✅ Middleware cho automatic bandwidth logging

### Frontend (Next.js)
- ✅ Hybrid Component Pattern (Server + Client Components)
- ✅ Real-time Dashboard với proper WebSocket management
- ✅ Clean useEffect patterns để tránh memory leaks
- ✅ UI Components với Tailwind CSS và Radix UI
- ✅ Socket.io client configuration

### Loại bỏ Files Cũ
- ✅ Đã xóa tất cả bandwidth components cũ không theo chuẩn
- ✅ Cleaned up hooks và services không cần thiết
- ✅ Removed global-bandwidth-context.tsx

## 🚀 Các Bước Triển khai

### 1. Cài đặt Dependencies
```bash
# Backend
cd talkplatform-backend
npm install
# Hoặc yarn install

# Frontend  
cd talkplatform-frontend
npm install
# Hoặc yarn install
```

### 2. Cấu hình Environment
```bash
# Backend
cp .env.example .env
# Cập nhật DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE

# Frontend
cp .env.local.example .env.local  
# Cập nhật NEXT_PUBLIC_NESTJS_URL=http://localhost:3000
```

### 3. Database Setup
```bash
cd talkplatform-backend

# Chạy migrations để tạo bandwidth tables
npm run migration:run

# Kiểm tra migration status
npm run migration:show
```

### 4. Khởi động Services
```bash
# Terminal 1: Backend
cd talkplatform-backend
npm run start:dev

# Terminal 2: Frontend  
cd talkplatform-frontend
npm run dev
```

### 5. Truy cập Dashboard
- Frontend: http://localhost:3001
- Admin Dashboard: http://localhost:3001/admin
- Backend API: http://localhost:3000
- Alternative Bandwidth Page: http://localhost:3001/admin/bandwidth

## 🔧 Kiểm tra Hoạt động

### 1. Backend Health Check
```bash
curl http://localhost:3000/
# Expected: "TalkPlatform Backend API is running!"
```

### 2. WebSocket Connection
- Mở browser console tại /admin page
- Verify "Connected to WebSocket" message
- Check for "system-metrics" events mỗi 5 giây

### 3. Database Verification
```sql
-- Kiểm tra tables đã được tạo
SHOW TABLES LIKE '%metrics%';

-- Expected: bandwidth_metrics, metrics_hourly

-- Kiểm tra structure
DESCRIBE bandwidth_metrics;
DESCRIBE metrics_hourly;
```

## 🎯 Tính năng Chính

### Real-time Monitoring
1. **System Overview Cards**
   - Total Bandwidth (real-time)
   - Active Users count
   - Current Connections
   - Average Response Time

2. **Endpoint Metrics Table**  
   - Per-endpoint bandwidth breakdown
   - Request counts
   - Response times
   - Max connections

3. **Auto-refresh**
   - WebSocket events mỗi 5 giây
   - API polling mỗi 10 giây khi monitoring active
   - Real-time status updates

### Data Flow
1. `BandwidthLoggerMiddleware` → captures request/response data
2. `TasksService` → aggregates data every 5s & 1hr  
3. `AppService` (Event Bus) → broadcasts metrics
4. `EventsGateway` → emits to WebSocket clients
5. `AdminRealtimeDashboard` → displays real-time data

## 🛠️ Troubleshooting

### Backend không khởi động
- Check .env database connection settings
- Verify MySQL is running and accessible
- Run `npm run migration:show` để check migrations

### WebSocket không connect
- Check CORS settings trong EventsGateway
- Verify NEXT_PUBLIC_NESTJS_URL trong .env.local
- Ensure backend port 3000 is accessible

### Dashboard không hiển thị data
- Click "Start Monitoring" button
- Check browser console for WebSocket events
- Verify API endpoints với Postman/curl

### Migration issues
```bash
# Revert last migration nếu cần
npm run migration:revert

# Re-run migrations
npm run migration:run
```

## 📈 Next Steps

### Production Deployment
1. Set NODE_ENV=production
2. Configure proper DATABASE_URL
3. Set up Redis for session storage
4. Enable HTTPS
5. Configure reverse proxy (nginx)

### Monitoring Enhancements  
1. Add Prometheus metrics integration
2. Set up Grafana dashboards
3. Implement alerts for high bandwidth usage
4. Add historical data visualization

### Performance Optimization
1. Database indexing optimization
2. Implement caching layers
3. WebSocket scaling với Redis adapter
4. CDN for static assets

## 📚 Architecture References

Hệ thống được xây dựng dựa trên các nguyên tắc từ báo cáo kỹ thuật:
- **Connection Pooling** (Section 1.1)
- **Write Optimization** (Section 1.3) 
- **Event Bus Pattern** (Section 2.3)
- **Hybrid Components** (Section 4.1)
- **WebSocket Management** (Section 4.2)

Xem thêm chi tiết trong `README-ADMIN-DASHBOARD.md`.