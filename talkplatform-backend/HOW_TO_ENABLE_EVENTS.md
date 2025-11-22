# 🎯 Cách Enable Events trong LiveKit Cloud

## Vấn đề
Bạn chỉ thấy "Send a test event" nhưng không biết cách enable các events khác.

## ✅ Giải pháp: Edit Webhook

### Bước 1: Vào Webhook Settings

1. Truy cập: https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
2. Scroll xuống phần **"Webhooks"**
3. Tìm webhook của bạn (tên "local")

### Bước 2: Click "Actions" → "Edit webhook"

1. Click nút **"Actions"** (dropdown menu bên phải webhook)
2. Chọn **"Edit webhook"**

### Bước 3: Enable Events

Trong form edit webhook, bạn sẽ thấy:

**Option 1: Có phần "Events" hoặc "Event Types"**
- Check các events bạn muốn:
  - ✅ room_started
  - ✅ room_finished
  - ✅ participant_joined
  - ✅ participant_left
  - ✅ track_published
  - ✅ track_unpublished

**Option 2: Không thấy phần Events**
- Có thể LiveKit Cloud tự động enable tất cả events mặc định
- Hoặc events được enable khi webhook được tạo
- **Giải pháp:** Xóa webhook cũ và tạo webhook mới, trong lúc tạo sẽ có option chọn events

### Bước 4: Save

1. Click **"Save"** hoặc **"Update"**
2. Webhook sẽ bắt đầu gửi events khi có activity

## 🔍 Kiểm tra Events đã được Enable

### Cách 1: Join Meeting và Check Logs

1. Join một meeting thực tế
2. Enable camera/mic
3. Check backend logs - bạn sẽ thấy:
   ```
   📨 Received LiveKit webhook: room_started
   📨 Received LiveKit webhook: participant_joined
   📨 Received LiveKit webhook: track_published
   ```

### Cách 2: Check Database

```sql
-- Xem tất cả webhook events đã nhận
SELECT 
  id, 
  event, 
  roomName, 
  isTestEvent, 
  processed, 
  createdAt 
FROM webhook_events 
ORDER BY createdAt DESC 
LIMIT 20;
```

### Cách 3: Qua API

```bash
# Get recent events
curl http://localhost:3000/webhooks/livekit/events

# Get statistics
curl http://localhost:3000/webhooks/livekit/stats
```

## 📊 Phân biệt Test Events vs Real Events

### Test Events
- Event type: `test` hoặc `webhook_test`
- `isTestEvent = true` trong database
- Không có `room` data
- Chỉ để verify webhook endpoint hoạt động

### Real Events
- Event types: `room_started`, `participant_joined`, etc.
- `isTestEvent = false` trong database
- Có `room` và `participant` data
- Được gửi khi có activity thực tế

## 🐛 Troubleshooting

### Vấn đề: Chỉ thấy test events, không thấy real events

**Nguyên nhân:** Events chưa được enable trong LiveKit Cloud

**Giải pháp:**
1. Edit webhook trong LiveKit Cloud
2. Đảm bảo tất cả events được enable
3. Nếu không thấy option, thử xóa và tạo lại webhook

### Vấn đề: Events nhận được nhưng database không update

**Kiểm tra:**
```sql
-- Xem events chưa được xử lý
SELECT * FROM webhook_events 
WHERE processed = false 
ORDER BY createdAt DESC;

-- Xem error messages
SELECT event, errorMessage, createdAt 
FROM webhook_events 
WHERE errorMessage IS NOT NULL 
ORDER BY createdAt DESC;
```

## 💡 Lưu ý quan trọng

1. **Test events ≠ Real events**
   - Test events chỉ verify endpoint hoạt động
   - Real events chỉ được gửi khi có activity thực tế (join meeting, enable camera, etc.)

2. **Events được enable trong LiveKit Cloud**
   - Không phải trong code
   - Phải edit webhook trong dashboard

3. **Database tracking**
   - Tất cả events (test + real) đều được lưu vào `webhook_events` table
   - Check `processed` field để biết event có được xử lý thành công không

## 🎯 Expected Result

Sau khi enable events và join meeting:

1. **Backend logs:**
   ```
   📨 Received LiveKit webhook: room_started
   🎬 Room started: meeting-abc123
   ✅ Updated meeting meeting-abc123 to LIVE status
   📨 Received LiveKit webhook: participant_joined
   👤 Participant joined: user-xyz in room meeting-abc123
   ✅ Updated participant count: 1
   ```

2. **Database:**
   - `webhook_events` có records mới
   - `meetings.status` = 'live'
   - `meetings.current_participants` tăng lên

3. **LiveKit Cloud Dashboard:**
   - Hiển thị activity và metrics real-time


