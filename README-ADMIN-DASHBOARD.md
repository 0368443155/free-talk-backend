# Admin Dashboard - Bandwidth Monitoring System

## Tổng quan
Admin Dashboard được triển khai theo mô tả kỹ thuật với NestJS backend và Next.js frontend, sử dụng WebSocket để theo dõi băng thông thời gian thực của toàn bộ hệ thống.

## Kiến trúc Hệ thống

### Backend (NestJS)
- **Connection Pooling**: Tối ưu hóa kết nối MySQL với `connectionLimit`
- **Metrics Entities**: `BandwidthMetric` và `MetricsHourly` cho dữ liệu thô và tổng hợp
- **Event Bus Pattern**: Sử dụng RxJS Subject trong `AppService` để tách biệt producers và consumers
- **WebSocket Gateway**: `EventsGateway` cho giao tiếp thời gian thực
- **Scheduled Tasks**: Tự động tổng hợp dữ liệu mỗi giờ và thu thập metrics mỗi 5 giây

### Frontend (Next.js)
- **Hybrid Component Pattern**: Server Component cho dữ liệu ban đầu, Client Component cho WebSocket
- **Real-time Dashboard**: `AdminRealtimeDashboard` component
- **Clean Socket Management**: Proper useEffect cleanup để tránh memory leaks

## Cài đặt và Triển khai

### 1. Backend Setup
```bash
cd talkplatform-backend

# Cài đặt dependencies (đã được cập nhật trong package.json)
npm install

# Cấu hình database
cp .env.example .env
# Cập nhật thông tin database trong .env

# Chạy migrations
npm run migration:run

# Khởi động server
npm run start:dev
```

### 2. Frontend Setup
```bash
cd talkplatform-frontend

# Cấu hình environment
cp .env.local.example .env.local
# Cập nhật NEXT_PUBLIC_NESTJS_URL trong .env.local

# Khởi động frontend
npm run dev
```

## Tính năng Chính

### 1. Real-time Bandwidth Monitoring
- **System Overview**: Tổng băng thông, số người dùng hoạt động, kết nối hiện tại
- **Endpoint Metrics**: Theo dõi băng thông theo từng endpoint trong 5 phút qua
- **Auto Refresh**: Cập nhật dữ liệu mỗi 5 giây qua WebSocket

### 2. Data Optimization
- **Write Optimization**: Sử dụng `queryBuilder.insert()` cho bulk operations
- **Pre-aggregation**: Tác vụ nền tổng hợp dữ liệu mỗi giờ
- **Efficient Indexing**: Index trên timestamp và endpoint cho truy vấn nhanh

### 3. WebSocket Events
- `system-metrics`: Metrics tổng quan hệ thống
- `join-admin-dashboard` / `leave-admin-dashboard`: Quản lý room cho admin

## API Endpoints

### Metrics API
- `GET /api/metrics/hourly?hours=24`: Lấy dữ liệu tổng hợp theo giờ
- `GET /api/metrics/realtime`: Metrics 5 phút gần nhất
- `GET /api/metrics/overview`: Tổng quan hệ thống 1 giờ qua
- `POST /api/metrics`: Tạo metric mới (chỉ admin/system)
- `POST /api/metrics/bulk`: Tạo metrics hàng loạt

## Database Schema

### bandwidth_metrics
- Lưu dữ liệu thô từng request
- Index trên timestamp cho range queries
- Không có foreign key để tối ưu write performance

### metrics_hourly  
- Dữ liệu được tổng hợp mỗi giờ
- Index trên timestamp và endpoint
- Sử dụng cho dashboard hiển thị lịch sử

## Monitoring Flow

1. **Data Collection**: Middleware `BandwidthLoggerMiddleware` ghi lại mỗi request
2. **Real-time Processing**: `TasksService` chạy mỗi 5 giây để tính toán metrics
3. **Event Broadcasting**: Metrics được gửi qua Event Bus đến WebSocket Gateway
4. **Frontend Display**: Dashboard nhận events và cập nhật UI real-time
5. **Data Aggregation**: Mỗi giờ, dữ liệu thô được tổng hợp và lưu vào `metrics_hourly`

## Usage

### Truy cập Admin Dashboard
1. Navigate đến `/admin` hoặc `/admin/bandwidth`
2. Click "Start Monitoring" để bắt đầu thu thập dữ liệu real-time
3. Xem metrics cập nhật tự động mỗi 5 giây

### Giám sát Bandwidth
- **Green**: < 100KB/s (Excellent)
- **Yellow**: 100KB/s - 500KB/s (Good)
- **Orange**: 500KB/s - 1MB/s (Fair) 
- **Red**: > 1MB/s (Critical)

## Performance Considerations

- **Connection Pooling**: Ngăn cạn kiệt kết nối database
- **Bulk Inserts**: Tối ưu cho high-frequency data
- **Memory Management**: Proper WebSocket cleanup
- **Data Retention**: Tự động xóa data cũ hơn 7 ngày

## Troubleshooting

### WebSocket Connection Issues
- Kiểm tra `NEXT_PUBLIC_NESTJS_URL` trong `.env.local`
- Đảm bảo backend đang chạy trên port 3000
- Check CORS configuration trong `EventsGateway`

### Database Issues  
- Verify connection pooling settings
- Check migration status: `npm run migration:show`
- Monitor connection count trong MySQL

### Performance Issues
- Enable database query logging trong development
- Monitor scheduled tasks execution
- Check memory usage của Node.js processes

## Tối ưu hóa Tương lai

1. **Prometheus Integration**: Thêm metrics cho external monitoring
2. **Caching Layer**: Redis cache cho frequently accessed data  
3. **Horizontal Scaling**: Load balancer cho multiple backend instances
4. **Advanced Analytics**: Machine learning cho predictive bandwidth analysis