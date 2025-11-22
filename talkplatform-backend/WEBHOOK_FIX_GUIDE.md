# 🔧 LiveKit Webhook Fix Guide

## ❌ Vấn đề: LiveKit Cloud không cập nhật dữ liệu

Sau khi chỉnh sửa code, LiveKit Cloud dashboard không cập nhật dữ liệu nữa mặc dù đã cấu hình ngrok và .env.

## 🔍 Nguyên nhân có thể:

1. **Ngrok URL đã thay đổi** - Mỗi lần restart ngrok, URL mới được tạo
2. **Webhook URL trong LiveKit Cloud chưa được cập nhật** - Vẫn đang trỏ đến URL cũ
3. **Ngrok tunnel không hoạt động** - Ngrok đã dừng hoặc bị lỗi
4. **Backend không nhận được webhook** - Endpoint không accessible

## ✅ Giải pháp từng bước:

### Bước 1: Kiểm tra ngrok đang chạy

```bash
# Kiểm tra ngrok API
curl http://localhost:4040/api/tunnels

# Hoặc mở browser
http://localhost:4040
```

**Nếu ngrok không chạy:**
```bash
# Start ngrok (thay 3000 bằng port backend của bạn)
ngrok http 3000
```

### Bước 2: Lấy ngrok URL hiện tại

**Cách 1: Qua API endpoint mới**
```bash
# Gọi endpoint để lấy ngrok URL
curl http://localhost:3000/api/v1/livekit/webhook-status/ngrok-url

# Hoặc qua browser
http://localhost:3000/api/v1/livekit/webhook-status/ngrok-url
```

**Cách 2: Qua ngrok dashboard**
- Mở: http://localhost:4040
- Copy URL từ "Forwarding" section
- Thêm `/webhooks/livekit` vào cuối

**Ví dụ:**
```
https://abc123.ngrok-free.app → https://abc123.ngrok-free.app/webhooks/livekit
```

### Bước 3: Cập nhật Webhook URL trong LiveKit Cloud

1. **Truy cập:** https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
2. **Tìm mục:** "Webhooks" (scroll xuống)
3. **Cập nhật URL:** 
   - Xóa URL cũ (nếu có)
   - Paste URL mới từ Bước 2
   - Format: `https://YOUR-NGROK-URL.ngrok-free.app/webhooks/livekit`
4. **Enable events:**
   - ✅ room_started
   - ✅ room_finished
   - ✅ participant_joined
   - ✅ participant_left
   - ✅ track_published
   - ✅ track_unpublished
5. **Click "Save"**

### Bước 4: Test webhook

**Cách 1: Test endpoint trực tiếp**
```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/webhooks/livekit \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Cách 2: Join meeting và check logs**
1. Join một meeting qua frontend
2. Enable camera/mic
3. Check backend logs - bạn sẽ thấy:
   ```
   📨 Received LiveKit webhook: room_started
   📨 Received LiveKit webhook: participant_joined
   📨 Received LiveKit webhook: track_published
   ```

### Bước 5: Verify data update

**Check database:**
```sql
-- Check meeting status
SELECT id, status, current_participants, started_at 
FROM meetings 
ORDER BY created_at DESC 
LIMIT 5;

-- Check webhook activity (nếu có metrics table)
SELECT * FROM livekit_metrics 
ORDER BY createdAt DESC 
LIMIT 10;
```

**Check LiveKit Cloud Dashboard:**
- Vào: https://cloud.livekit.io/projects/p_3fki8uttl2h/overview
- Bạn sẽ thấy activity và metrics được cập nhật real-time

## 🔧 Troubleshooting

### Vấn đề 1: Ngrok URL thay đổi mỗi lần restart

**Giải pháp:** Sử dụng ngrok với static domain (yêu cầu ngrok account)

```bash
# Với ngrok account, bạn có thể reserve domain
ngrok http 3000 --domain=your-static-domain.ngrok-free.app
```

### Vấn đề 2: Webhook không nhận được requests

**Kiểm tra:**
1. Backend có đang chạy không?
2. Endpoint `/webhooks/livekit` có tồn tại không?
3. Check backend logs có lỗi gì không?

**Test:**
```bash
# Test endpoint local
curl -X POST http://localhost:3000/webhooks/livekit \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test qua ngrok
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/webhooks/livekit \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Vấn đề 3: 401 Unauthorized

**Nguyên nhân:** LIVEKIT_API_KEY hoặc LIVEKIT_API_SECRET sai

**Kiểm tra:**
```bash
# Check .env file
cat .env | grep LIVEKIT

# Verify trong LiveKit Cloud
# Vào: https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
# Copy API Key và Secret
```

### Vấn đề 4: CORS hoặc ngrok warning page

**Giải pháp:** Bypass ngrok warning (chỉ cho testing)

```bash
# Thêm header để bypass warning
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/webhooks/livekit \
  -H "ngrok-skip-browser-warning: true" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Lưu ý:** LiveKit Cloud sẽ tự động bypass warning, không cần lo.

## 📋 Checklist

- [ ] Ngrok đang chạy và accessible
- [ ] Đã lấy ngrok URL hiện tại
- [ ] Đã cập nhật webhook URL trong LiveKit Cloud
- [ ] Đã enable tất cả events cần thiết
- [ ] Đã test webhook endpoint
- [ ] Backend logs hiển thị webhook events
- [ ] Database được update
- [ ] LiveKit Cloud dashboard hiển thị activity

## 🎯 Quick Commands

```bash
# 1. Get ngrok URL
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# 2. Test webhook endpoint
curl http://localhost:3000/api/v1/livekit/webhook-status/test

# 3. Get full instructions
curl http://localhost:3000/api/v1/livekit/webhook-status/instructions

# 4. Check webhook health
curl http://localhost:3000/api/v1/debug-public/webhook-health
```

## 📞 Support

Nếu vẫn không work, check:
1. Backend logs: `npm run start:dev`
2. Ngrok logs: http://localhost:4040
3. LiveKit Cloud logs: https://cloud.livekit.io/projects/p_3fki8uttl2h/logs

