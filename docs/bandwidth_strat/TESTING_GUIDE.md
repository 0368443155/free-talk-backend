# 🧪 BANDWIDTH MONITORING - TESTING GUIDE

## 📊 TỔNG QUAN CÁC LUỒNG

### **LUỒNG 1: HTTP/API Metrics (Phase 1)**

```
HTTP Request → MetricsMiddleware → MetricsCollector → Redis List → Bull Queue → MetricsProcessor → MySQL
```

**Các bước:**
1. User gửi HTTP request (bất kỳ API endpoint nào)
2. `MetricsMiddleware` intercept request/response
3. Tính toán: request size, response size, response time
4. `MetricsCollector` push vào Redis List (`metrics:buffer`)
5. `MetricsScheduler` (cron 5s) trigger Bull Queue job
6. `MetricsProcessor` process batch từ Redis List
7. Aggregate metrics và update Redis Hash (`metrics:realtime:*`)
8. Persist vào MySQL (`metrics_hourly`) mỗi giờ

**Test thủ công:**
```bash
# 1. Gửi request bất kỳ
curl http://localhost:3000/api/v1/courses

# 2. Check Redis buffer (sau 1-2 giây)
npm run check:metrics

# 3. Check real-time metrics
curl http://localhost:3000/api/v1/metrics/realtime
# (cần JWT token admin)

# 4. Check MySQL (sau 1 giờ)
# SELECT * FROM metrics_hourly ORDER BY hour_start DESC LIMIT 5;
```

---

### **LUỒNG 2: WebRTC Metrics (Phase 2)**

```
Meeting Room → Web Worker → useWebRTCStatsWorker → useThrottledMetrics → Socket.IO → MeetingMetricsGateway → Redis
```

**Các bước:**
1. User join meeting room
2. `useWebRTCStatsWorker` hook khởi tạo Web Worker
3. Web Worker tính toán stats từ `RTCPeerConnection.getStats()` mỗi 1 giây
4. Tính toán: upload/download bitrate, latency, packet loss, TURN detection
5. `useThrottledMetrics` throttle và emit qua Socket.IO (10s interval hoặc khi có thay đổi)
6. `MeetingMetricsGateway` nhận metrics qua namespace `/meeting-metrics`
7. Lưu vào Redis với TTL 5 phút (`meeting:{meetingId}:user:{userId}:metrics`)
8. Broadcast đến admin dashboard (throttled 2s)
9. Trigger alerts nếu có vấn đề (high latency, packet loss, TURN relay, poor connection)

**Test thủ công:**
```bash
# 1. Start backend
cd talkplatform-backend
npm run start:dev

# 2. Start frontend
cd talkplatform-frontend
npm run dev

# 3. Join meeting room (cần 2+ users để có peer connections)
# - Mở 2 browser windows
# - Join cùng một meeting
# - Bật camera/mic

# 4. Check WebRTC stats trong browser console
# - Mở DevTools → Console
# - Sẽ thấy logs: "Metric collected", "Emitting metrics"

# 5. Check Redis (sau khi có metrics)
npm run check:webrtc

# 6. Check admin dashboard
# - Mở /admin/meetings
# - Sẽ thấy real-time updates
```

---

### **LUỒNG 3: Admin Dashboard (Phase 3)**

```
Socket.IO Events → Admin Dashboard → Display → Charts → Export
```

**Các bước:**
1. Admin mở `/admin/meetings`
2. Socket.IO connect đến `/meeting-metrics` namespace
3. Emit `admin:subscribe` để join `admin-dashboard` room
4. Nhận real-time updates:
   - `meeting:metrics:update` (throttled 2s)
   - `meeting:alerts` (immediate)
5. Hiển thị:
   - Summary cards (Active Meetings, Total Users, TURN Users, Alerts)
   - Meeting cards với user metrics
   - Alerts list
   - Charts (bandwidth over time, quality distribution)
6. Export functionality:
   - CSV export
   - JSON export

**Test thủ công:**
```bash
# 1. Mở admin dashboard
# http://localhost:3001/admin/meetings
# (cần login với admin account)

# 2. Chạy test script để simulate users
cd talkplatform-backend
npm run test:webrtc

# 3. Quan sát dashboard:
# - Summary cards update real-time
# - Meeting cards xuất hiện
# - Alerts hiển thị khi có vấn đề
# - Charts update

# 4. Test export
# - Click "Export CSV" → Download file
# - Click "Export JSON" → Download file
```

---

## 🔍 CHI TIẾT TESTING

### **Test Phase 1: HTTP Metrics**

**1. Test Metrics Collection:**
```bash
# Terminal 1: Start backend
cd talkplatform-backend
npm run start:dev

# Terminal 2: Send test requests
curl http://localhost:3000/api/v1/courses
curl http://localhost:3000/api/v1/auth/me

# Terminal 3: Check metrics
npm run check:metrics
```

**2. Verify Redis Buffer:**
```bash
redis-cli LLEN metrics:buffer
redis-cli LRANGE metrics:buffer 0 4
```

**3. Verify Real-time View:**
```bash
redis-cli KEYS "metrics:realtime:*"
redis-cli HGETALL "metrics:realtime:/api/v1/courses:GET"
```

**4. Verify MySQL Persistence:**
```sql
-- Check hourly metrics
SELECT * FROM metrics_hourly 
ORDER BY hour_start DESC 
LIMIT 10;

-- Check daily metrics
SELECT * FROM metrics_daily 
ORDER BY date DESC 
LIMIT 5;
```

---

### **Test Phase 2: WebRTC Metrics**

**1. Setup Meeting:**
- Cần 2+ users join cùng meeting
- Bật camera/mic để có peer connections

**2. Check Web Worker:**
- Mở DevTools → Sources → Workers
- Verify `webrtc-stats.worker.js` đang chạy
- Check console logs: "Worker ready"

**3. Check Stats Collection:**
- Browser console sẽ log:
  ```
  📊 User user-0 sent metrics: good, relay: false
  Emitting metrics: { uploadBitrate: 500, downloadBitrate: 1000, ... }
  ```

**4. Check Socket Events:**
- Mở DevTools → Network → WS
- Filter: `meeting-metrics`
- Verify events: `meeting:metrics` được emit

**5. Check Redis Storage:**
```bash
npm run check:webrtc

# Hoặc manual:
redis-cli KEYS "meeting:*:user:*:metrics"
redis-cli GET "meeting:test-meeting:user:user-123:metrics"
```

**6. Check Throttling:**
- Metrics chỉ được emit mỗi 10 giây hoặc khi có thay đổi quan trọng
- Verify trong console: không thấy emit mỗi giây

---

### **Test Phase 3: Admin Dashboard**

**1. Open Dashboard:**
```
http://localhost:3001/admin/meetings
```

**2. Verify Socket Connection:**
- Mở DevTools → Network → WS
- Verify connection đến `/meeting-metrics`
- Check console: "Admin connected to meeting-metrics"

**3. Test Real-time Updates:**
- Chạy test script: `npm run test:webrtc`
- Dashboard sẽ update:
  - Summary cards
  - Meeting cards
  - Alerts (nếu có)

**4. Test Charts:**
- Click tab "Analytics"
- Verify charts hiển thị:
  - Bandwidth over time (line chart)
  - Quality distribution (pie chart)

**5. Test Export:**
- Click "Export CSV" → Verify download
- Click "Export JSON" → Verify download
- Check file content

---

## 🎯 TESTING CHECKLIST

### Phase 1 Checklist:
- [ ] HTTP request trigger metrics collection
- [ ] Redis buffer có data
- [ ] Real-time view update
- [ ] MySQL persistence sau 1 giờ
- [ ] Metrics API endpoints hoạt động

### Phase 2 Checklist:
- [ ] Web Worker khởi tạo thành công
- [ ] Stats được collect mỗi 1 giây
- [ ] Socket events emit đúng (throttled)
- [ ] Redis lưu metrics với TTL
- [ ] TURN detection hoạt động
- [ ] UI components hiển thị (ConnectionQualityIndicator, BandwidthDisplay)
- [ ] Meeting room controls bar hiển thị real data

### Phase 3 Checklist:
- [ ] Admin dashboard load
- [ ] Socket connection thành công
- [ ] Real-time updates nhận được
- [ ] Summary cards hiển thị đúng
- [ ] Meeting cards expand/collapse
- [ ] Alerts hiển thị
- [ ] Charts render
- [ ] Export CSV/JSON hoạt động

---

## 🐛 TROUBLESHOOTING

### Issue: Không thấy metrics trong Redis
**Check:**
1. Backend đang chạy?
2. Redis đang chạy? `redis-cli ping`
3. Middleware đã được register? Check `app.module.ts`

### Issue: WebRTC stats không collect
**Check:**
1. Worker file tồn tại? `public/workers/webrtc-stats.worker.js`
2. Có peer connections? Check `peers.size > 0`
3. Browser console có errors?

### Issue: Admin dashboard không nhận updates
**Check:**
1. Socket connection thành công?
2. Đã emit `admin:subscribe`?
3. Backend gateway đang chạy?
4. Check Network tab → WS connection

### Issue: Charts không hiển thị
**Check:**
1. Recharts đã install? `npm list recharts`
2. Có data để hiển thị?
3. Browser console có errors?

---

## 📝 TESTING SCENARIOS

### Scenario 1: Single User HTTP Request
1. Gửi 1 HTTP request
2. Wait 6 giây (để processor chạy)
3. Check Redis buffer → Should have 1 metric
4. Check real-time view → Should have endpoint

### Scenario 2: Multiple Users in Meeting
1. 3 users join meeting
2. Bật camera/mic
3. Wait 10 giây
4. Check admin dashboard → Should see 3 users
5. Check Redis → Should have 3 user metrics

### Scenario 3: TURN Relay Detection
1. User join meeting với network restrictions (simulate TURN)
2. Check metrics → `usingRelay: true`
3. Check admin dashboard → TURN Users card > 0
4. Check alerts → Should have "using-turn" alert

### Scenario 4: Poor Connection Alert
1. Simulate poor connection (high latency, packet loss)
2. Check alerts → Should have "poor-connection" alert
3. Check admin dashboard → Critical Alerts > 0

### Scenario 5: Export Functionality
1. Có active meetings trong dashboard
2. Click "Export CSV"
3. Verify file download
4. Open file → Check data format
5. Repeat với JSON export

---

## ✅ SUCCESS CRITERIA

### Phase 1:
- ✅ Metrics collected cho mọi HTTP request
- ✅ Redis buffer < 5000 items
- ✅ Real-time view update < 5s
- ✅ MySQL persistence mỗi giờ

### Phase 2:
- ✅ Stats collect mỗi 1 giây
- ✅ Socket events < 10/user/minute
- ✅ UI maintain 60 FPS
- ✅ TURN detection 100% accurate

### Phase 3:
- ✅ Dashboard load < 2s
- ✅ Real-time updates < 2s latency
- ✅ Charts render correctly
- ✅ Export files valid

---

**Happy Testing! 🚀**

