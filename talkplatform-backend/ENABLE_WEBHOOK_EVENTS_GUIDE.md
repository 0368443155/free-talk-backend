# 🔧 Hướng dẫn Enable Webhook Events trong LiveKit Cloud

## ❌ Vấn đề
Bạn chỉ thấy "Send a test event" nhưng không biết cách enable các events khác (room_started, participant_joined, etc.)

## ✅ Giải pháp: Enable Events trong LiveKit Cloud

### Bước 1: Edit Webhook

1. **Truy cập:** https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
2. **Tìm webhook của bạn** (tên "local")
3. **Click nút "Actions"** (dropdown menu)
4. **Chọn "Edit webhook"**

### Bước 2: Enable Events

Sau khi click "Edit webhook", bạn sẽ thấy form với các options:

**Trong form edit webhook, tìm phần "Events" hoặc "Event Types":**

Enable các events sau:
- ✅ **room_started** - Khi room được tạo
- ✅ **room_finished** - Khi room kết thúc
- ✅ **participant_joined** - Khi user join room
- ✅ **participant_left** - Khi user leave room
- ✅ **track_published** - Khi user bật camera/mic
- ✅ **track_unpublished** - Khi user tắt camera/mic

**Lưu ý:** 
- Nếu không thấy phần "Events", có thể LiveKit Cloud tự động enable tất cả events
- Hoặc events được enable mặc định khi webhook được tạo

### Bước 3: Save và Test

1. **Click "Save"** hoặc "Update"
2. **Test bằng cách:**
   - Join một meeting thực tế
   - Hoặc click "Send a test event" để verify

## 🔍 Kiểm tra Events đã được gửi

### Cách 1: Check Backend Logs

Sau khi join meeting, check backend terminal:
```
📨 Received LiveKit webhook: room_started
🎬 Room started: meeting-123
📨 Received LiveKit webhook: participant_joined
👤 Participant joined: user-456
```

### Cách 2: Check Database

**Query webhook events:**
```sql
SELECT * FROM webhook_events 
ORDER BY createdAt DESC 
LIMIT 20;
```

**Query meetings để xem status:**
```sql
SELECT id, status, current_participants, started_at 
FROM meetings 
ORDER BY created_at DESC 
LIMIT 5;
```

### Cách 3: Qua API Endpoint

```bash
# Get recent webhook events
curl http://localhost:3000/webhooks/livekit/events

# Get webhook statistics
curl http://localhost:3000/webhooks/livekit/stats
```

## 🐛 Troubleshooting

### Vấn đề 1: Test event nhận được nhưng real events không

**Nguyên nhân:** Events chưa được enable trong LiveKit Cloud

**Giải pháp:**
1. Edit webhook trong LiveKit Cloud
2. Đảm bảo tất cả events được enable
3. Save và test lại

### Vấn đề 2: Events nhận được nhưng database không update

**Kiểm tra:**
1. Check backend logs có lỗi không
2. Check `webhook_events` table xem events có được lưu không
3. Check `processed` field - nếu `false` thì có lỗi xử lý

**Query để check:**
```sql
SELECT 
  event, 
  processed, 
  errorMessage, 
  createdAt 
FROM webhook_events 
WHERE processed = false 
ORDER BY createdAt DESC;
```

### Vấn đề 3: Meeting không tìm thấy trong database

**Nguyên nhân:** Room name trong LiveKit không khớp với meeting ID

**Kiểm tra:**
- Room name format: `meeting-{meetingId}` hoặc chỉ `{meetingId}`
- Verify meeting ID trong database

**Fix:** Update `handleRoomStarted` để log room name và check format

## 📋 Checklist

- [ ] Đã edit webhook trong LiveKit Cloud
- [ ] Đã enable tất cả events cần thiết
- [ ] Đã save webhook configuration
- [ ] Đã test bằng cách join meeting
- [ ] Backend logs hiển thị webhook events
- [ ] Database có records trong `webhook_events` table
- [ ] Meetings được update (status, current_participants)

## 🎯 Expected Behavior

Sau khi enable events và join meeting:

1. **Backend logs:**
   ```
   📨 Received LiveKit webhook: room_started
   🎬 Room started: meeting-abc123
   ✅ Updated meeting meeting-abc123 to LIVE status
   📨 Received LiveKit webhook: participant_joined
   👤 Participant joined: user-xyz (user-xyz) in room meeting-abc123
   ✅ Updated participant count for meeting-abc123: 1
   ```

2. **Database:**
   - `meetings.status` = 'live'
   - `meetings.current_participants` tăng lên
   - `webhook_events` có records mới với `processed = true`

3. **LiveKit Cloud Dashboard:**
   - Hiển thị activity và metrics
   - Data được cập nhật real-time

## 💡 Lưu ý

- **Test events** chỉ để verify webhook endpoint hoạt động
- **Real events** chỉ được gửi khi có activity thực tế (join meeting, enable camera, etc.)
- Nếu chỉ thấy test events, có nghĩa là events chưa được enable hoặc chưa có activity thực tế


