# 🔍 Debug Data Inconsistency Analysis

## 📊 Data hiện tại (từ SQL queries):

### Meetings trong 24h qua:
- **Total**: 5 meetings
- **By hour**: 3 meetings lúc 08:00, 1 lúc 14:00, 1 lúc 17:00
- **Status**: Tất cả đang "live"

### LiveKit Metrics:
- **Total metrics**: 10 records
- **Unique meetings**: 5 (match với số meetings)

## 🚨 Vấn đề bạn gặp:
1. **Dashboard hiển thị chỉ 2 sessions trên biểu đồ**
2. **Nhưng total room sessions lại hiển thị 9**
3. **Data chỉ update đến 8h chứ không phải 9h**

## 🔍 Nguyên nhân có thể:

### 1. **Time Zone Issues**
- Server time: UTC hoặc local time?
- Dashboard display time: có convert timezone không?
- Bạn hiện tại ở múi giờ GMT+7 (Vietnam)

### 2. **Caching Issues**
- Dashboard cache data cũ
- Browser cache
- API response caching

### 3. **Khác biệt giữa data sources**
- Dashboard graph lấy từ `livekit_metrics` (chỉ có 2 distinct time buckets?)
- Total count lấy từ `meetings` table (có 5 records, nhưng tại sao lại hiển thị 9?)

## 🛠️ Quick Fix Commands:

### Check timezone
```sql
SELECT NOW() as server_time, 
       CONVERT_TZ(NOW(), '+00:00', '+07:00') as vietnam_time,
       @@session.time_zone as session_timezone;
```

### Check exact hour distribution
```sql
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as exact_hour,
    COUNT(*) as meeting_count
FROM meetings 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY exact_hour
ORDER BY exact_hour;
```

### Check if there are "ghost" meetings
```sql
SELECT COUNT(*) as total_meetings_ever FROM meetings;
SELECT COUNT(*) as total_meetings_24h FROM meetings WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
```