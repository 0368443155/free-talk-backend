# 📊 CHIẾN LƯỢC ĐO VÀ KIỂM SOÁT BĂNG THÔNG

**Date**: 2025-12-02  
**Version**: 1.0  
**Status**: Planning Phase

---

## 🎯 MỤC TIÊU

### Mục tiêu chính:
1. **Giám sát real-time** băng thông của toàn hệ thống
2. **Phát hiện sớm** các vấn đề về performance
3. **Tối ưu hóa** chi phí bandwidth
4. **Cảnh báo** khi vượt ngưỡng
5. **Phân tích** xu hướng sử dụng

### KPIs cần đo:
- **Total Bandwidth**: Tổng băng thông (upload + download)
- **Request Rate**: Số request/giây
- **Response Time**: Thời gian phản hồi trung bình
- **Error Rate**: Tỷ lệ lỗi
- **Active Connections**: Số kết nối đang hoạt động
- **Top Consumers**: Endpoints tiêu tốn nhiều băng thông nhất

---

## 📐 KIẾN TRÚC HỆ THỐNG

### 1. Data Collection Layer (Thu thập dữ liệu)

```
┌─────────────────────────────────────────────────────────┐
│                    NestJS Middleware                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Request    │  │   Response   │  │   WebSocket  │  │
│  │  Interceptor │  │  Interceptor │  │   Gateway    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Collection Service                  │
│  • Track request/response size                          │
│  • Measure response time                                │
│  • Count active connections                             │
│  • Aggregate by endpoint                                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Storage Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   In-Memory  │  │   Database   │  │   Time-Series│  │
│  │   (Redis)    │  │   (MySQL)    │  │   (Optional) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Real-time Broadcasting                      │
│  • WebSocket to Admin Dashboard                         │
│  • Push notifications                                   │
│  • Alert system                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Backend - Metrics Collection (Week 1)

#### 1.1. Create Metrics Interceptor
**File**: `src/common/interceptors/metrics.interceptor.ts`

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const requestSize = this.getRequestSize(request);
    
    return next.handle().pipe(
      tap((response) => {
        const responseTime = Date.now() - startTime;
        const responseSize = this.getResponseSize(response);
        
        // Emit metrics
        this.metricsService.record({
          endpoint: request.url,
          method: request.method,
          requestSize,
          responseSize,
          responseTime,
          statusCode: context.switchToHttp().getResponse().statusCode,
          timestamp: new Date(),
        });
      }),
    );
  }
}
```

#### 1.2. Create Metrics Service
**File**: `src/modules/metrics/metrics.service.ts`

**Responsibilities**:
- Store metrics in Redis (real-time, 5-minute window)
- Aggregate metrics by endpoint
- Calculate averages, totals, peaks
- Persist to MySQL (hourly aggregates)
- Emit WebSocket events to admin dashboard

**Data Structure**:
```typescript
interface MetricRecord {
  endpoint: string;
  method: string;
  requestSize: number;      // bytes
  responseSize: number;     // bytes
  responseTime: number;     // milliseconds
  statusCode: number;
  timestamp: Date;
  userId?: string;          // optional, for user-level tracking
}

interface AggregatedMetrics {
  endpoint: string;
  totalRequests: number;
  totalInbound: number;     // bytes
  totalOutbound: number;    // bytes
  avgResponseTime: number;  // ms
  maxResponseTime: number;  // ms
  minResponseTime: number;  // ms
  errorCount: number;
  successCount: number;
  timeWindow: string;       // '5min', '1hour', '1day'
}
```

#### 1.3. Create Database Schema
**File**: `src/migrations/XXXXXX-create-metrics-tables.ts`

```sql
-- Real-time metrics (short-term storage)
CREATE TABLE metrics_realtime (
  id VARCHAR(36) PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_size INT NOT NULL,
  response_size INT NOT NULL,
  response_time INT NOT NULL,
  status_code INT NOT NULL,
  user_id VARCHAR(36),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_endpoint (endpoint),
  INDEX idx_timestamp (timestamp),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Hourly aggregates (long-term storage)
CREATE TABLE metrics_hourly (
  id VARCHAR(36) PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  hour_start TIMESTAMP NOT NULL,
  total_requests INT DEFAULT 0,
  total_inbound BIGINT DEFAULT 0,
  total_outbound BIGINT DEFAULT 0,
  avg_response_time DECIMAL(10,2) DEFAULT 0,
  max_response_time INT DEFAULT 0,
  min_response_time INT DEFAULT 0,
  error_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_endpoint_hour (endpoint, hour_start),
  INDEX idx_hour_start (hour_start)
) ENGINE=InnoDB;

-- Daily aggregates (analytics)
CREATE TABLE metrics_daily (
  id VARCHAR(36) PRIMARY KEY,
  date DATE NOT NULL,
  total_bandwidth BIGINT DEFAULT 0,
  total_requests INT DEFAULT 0,
  avg_response_time DECIMAL(10,2) DEFAULT 0,
  peak_bandwidth BIGINT DEFAULT 0,
  peak_hour TIMESTAMP,
  unique_users INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_date (date)
) ENGINE=InnoDB;

-- Bandwidth alerts
CREATE TABLE bandwidth_alerts (
  id VARCHAR(36) PRIMARY KEY,
  alert_type ENUM('threshold', 'spike', 'anomaly') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  message TEXT NOT NULL,
  metric_value BIGINT NOT NULL,
  threshold_value BIGINT,
  endpoint VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_created (created_at),
  INDEX idx_severity (severity)
) ENGINE=InnoDB;
```

---

### Phase 2: Backend - API Endpoints (Week 1)

#### 2.1. Metrics Controller
**File**: `src/modules/metrics/metrics.controller.ts`

**Endpoints**:

```typescript
// Real-time metrics (last 5 minutes)
GET /api/v1/metrics/realtime
Response: {
  endpoints: [
    {
      endpoint: '/api/v1/courses',
      totalRequests: 1234,
      totalInbound: 45678,    // bytes
      totalOutbound: 123456,  // bytes
      avgResponseTime: 45,    // ms
      maxConnections: 12
    }
  ],
  summary: {
    totalBandwidth: 169134,
    activeConnections: 45,
    requestsPerSecond: 4.1
  }
}

// Hourly aggregates (last 24 hours)
GET /api/v1/metrics/hourly?hours=24
Response: [
  {
    hour: '2025-12-02T08:00:00Z',
    endpoint: '/api/v1/courses',
    totalRequests: 5678,
    totalBandwidth: 234567890,
    avgResponseTime: 67
  }
]

// Daily summary
GET /api/v1/metrics/daily?days=7
Response: [
  {
    date: '2025-12-02',
    totalBandwidth: 12345678901,
    totalRequests: 123456,
    avgResponseTime: 78,
    peakBandwidth: 987654321,
    peakHour: '2025-12-02T14:00:00Z'
  }
]

// Top consumers
GET /api/v1/metrics/top-consumers?limit=10&period=1h
Response: [
  {
    endpoint: '/api/v1/meetings/:id/stream',
    totalBandwidth: 987654321,
    percentage: 45.2
  }
]

// Alerts
GET /api/v1/metrics/alerts?status=active
POST /api/v1/metrics/alerts/:id/resolve
```

---

### Phase 3: Frontend - Admin Dashboard (Week 2)

#### 3.1. Dashboard Components

**File Structure**:
```
components/admin/
├── bandwidth/
│   ├── BandwidthOverview.tsx       # Tổng quan
│   ├── BandwidthChart.tsx          # Biểu đồ real-time
│   ├── EndpointTable.tsx           # Bảng endpoints
│   ├── TopConsumers.tsx            # Top tiêu thụ
│   └── BandwidthAlerts.tsx         # Cảnh báo
├── metrics/
│   ├── MetricsCard.tsx             # Card hiển thị metric
│   ├── TrendIndicator.tsx          # Mũi tên tăng/giảm
│   └── PercentageBar.tsx           # Thanh %
└── charts/
    ├── LineChart.tsx               # Biểu đồ đường
    ├── BarChart.tsx                # Biểu đồ cột
    └── PieChart.tsx                # Biểu đồ tròn
```

#### 3.2. Dashboard Layout

```typescript
// app/admin/bandwidth/page.tsx
export default function BandwidthDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1>Bandwidth Monitoring</h1>
        <div className="flex gap-2">
          <TimeRangeSelector />
          <ExportButton />
          <RefreshButton />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricsCard
          title="Total Bandwidth"
          value="1.2 GB"
          trend="+12%"
          icon={<Activity />}
        />
        <MetricsCard
          title="Requests/sec"
          value="45.2"
          trend="-5%"
          icon={<Zap />}
        />
        <MetricsCard
          title="Avg Response"
          value="67ms"
          trend="+3%"
          icon={<Clock />}
        />
        <MetricsCard
          title="Active Connections"
          value="234"
          trend="+8%"
          icon={<Users />}
        />
      </div>

      {/* Real-time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bandwidth Usage (Real-time)</CardTitle>
        </CardHeader>
        <CardContent>
          <BandwidthChart data={realtimeData} />
        </CardContent>
      </Card>

      {/* Endpoint Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Consumers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopConsumers data={topConsumers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoint Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={distribution} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <EndpointTable data={endpoints} />
        </CardContent>
      </Card>

      {/* Alerts */}
      <BandwidthAlerts alerts={alerts} />
    </div>
  );
}
```

---

### Phase 4: Alert System (Week 2)

#### 4.1. Alert Rules

```typescript
// Alert thresholds
const ALERT_THRESHOLDS = {
  bandwidth: {
    warning: 100 * 1024 * 1024,    // 100 MB/min
    critical: 500 * 1024 * 1024,   // 500 MB/min
  },
  responseTime: {
    warning: 500,                   // 500ms
    critical: 2000,                 // 2s
  },
  errorRate: {
    warning: 0.05,                  // 5%
    critical: 0.15,                 // 15%
  },
  connections: {
    warning: 500,
    critical: 1000,
  },
};

// Alert types
enum AlertType {
  THRESHOLD = 'threshold',    // Vượt ngưỡng
  SPIKE = 'spike',           // Tăng đột ngột
  ANOMALY = 'anomaly',       // Bất thường
}

// Alert actions
- Send email to admin
- Push notification to dashboard
- Log to database
- Trigger auto-scaling (optional)
```

---

## 📊 METRICS TO TRACK

### 1. Bandwidth Metrics
- **Total Inbound**: Tổng data nhận vào (bytes)
- **Total Outbound**: Tổng data gửi ra (bytes)
- **Peak Bandwidth**: Băng thông cao nhất
- **Average Bandwidth**: Băng thông trung bình
- **Bandwidth by Endpoint**: Phân bổ theo endpoint

### 2. Performance Metrics
- **Response Time**: P50, P95, P99
- **Request Rate**: Requests/second
- **Error Rate**: % requests lỗi
- **Success Rate**: % requests thành công

### 3. Connection Metrics
- **Active Connections**: Số kết nối đang hoạt động
- **Connection Duration**: Thời gian kết nối trung bình
- **WebSocket Connections**: Số WebSocket đang mở

### 4. User Metrics
- **Active Users**: Số user đang online
- **Bandwidth per User**: Băng thông/user
- **Top Users**: Users tiêu tốn nhiều nhất

---

## 🎨 UI/UX DESIGN

### Dashboard Sections:

1. **Overview Section** (Top)
   - 4 summary cards
   - Real-time chart (last 5 minutes)
   - Status indicators

2. **Analysis Section** (Middle)
   - Top consumers table
   - Endpoint distribution pie chart
   - Trend comparison

3. **Details Section** (Bottom)
   - Full endpoint table (sortable, filterable)
   - Historical data chart
   - Export functionality

4. **Alerts Section** (Sidebar/Modal)
   - Active alerts list
   - Alert history
   - Alert configuration

### Color Coding:
- 🟢 **Green**: Normal (< 70% threshold)
- 🟡 **Yellow**: Warning (70-90% threshold)
- 🟠 **Orange**: High (90-100% threshold)
- 🔴 **Red**: Critical (> 100% threshold)

---

## 🔄 DATA FLOW

```
1. Request arrives → Interceptor captures
2. Interceptor → MetricsService.record()
3. MetricsService → Store in Redis (real-time)
4. MetricsService → Emit WebSocket event
5. Admin Dashboard → Receives real-time update
6. Background Job → Aggregate to MySQL (hourly)
7. Alert Service → Check thresholds
8. Alert Service → Notify if exceeded
```

---

## ⚙️ CONFIGURATION

### Environment Variables:
```env
# Metrics
METRICS_ENABLED=true
METRICS_RETENTION_DAYS=30
METRICS_AGGREGATION_INTERVAL=3600000  # 1 hour in ms

# Alerts
ALERT_EMAIL=admin@example.com
ALERT_WEBHOOK_URL=https://...
BANDWIDTH_THRESHOLD_WARNING=104857600  # 100MB
BANDWIDTH_THRESHOLD_CRITICAL=524288000 # 500MB

# Redis
REDIS_METRICS_TTL=300  # 5 minutes
```

---

## 📈 OPTIMIZATION STRATEGIES

### 1. Reduce Bandwidth:
- Enable gzip compression
- Implement CDN for static assets
- Optimize image sizes
- Use pagination for large datasets
- Implement caching (Redis)

### 2. Improve Performance:
- Database query optimization
- Add database indexes
- Implement connection pooling
- Use load balancing

### 3. Cost Control:
- Set bandwidth limits per user
- Implement rate limiting
- Monitor and block abusive users
- Use tiered pricing alerts

---

## 🧪 TESTING PLAN

### 1. Load Testing:
- Simulate 1000 concurrent users
- Test bandwidth under load
- Measure response times
- Verify alert triggers

### 2. Stress Testing:
- Push system to limits
- Test auto-scaling
- Verify graceful degradation

### 3. Monitoring Testing:
- Verify metrics accuracy
- Test WebSocket reliability
- Validate alert delivery

---

## 📅 TIMELINE

### Week 1: Backend
- Day 1-2: Metrics Interceptor + Service
- Day 3-4: Database schema + migrations
- Day 5: API endpoints + testing

### Week 2: Frontend
- Day 1-2: Dashboard components
- Day 3-4: Charts + real-time updates
- Day 5: Alert system + testing

### Week 3: Integration & Testing
- Day 1-2: End-to-end testing
- Day 3-4: Performance optimization
- Day 5: Documentation + deployment

---

## 🎯 SUCCESS CRITERIA

✅ Real-time bandwidth monitoring working  
✅ Metrics accuracy > 99%  
✅ Dashboard updates < 1s latency  
✅ Alerts trigger within 5s  
✅ Historical data retention 30 days  
✅ Export functionality working  
✅ Mobile responsive design  

---

## 📝 NOTES

- Use **Redis** for real-time data (fast, in-memory)
- Use **MySQL** for historical data (persistent, queryable)
- Consider **InfluxDB** for time-series data (optional, for scale)
- Implement **data retention policy** (auto-delete old data)
- Add **export to CSV/Excel** for reports
- Consider **Grafana integration** for advanced analytics

---

**Status**: ✅ Planning Complete - Ready for Implementation  
**Next Step**: Review and approve plan → Start Week 1 implementation
