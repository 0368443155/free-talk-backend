# ⚡ Quick Webhook Fix - LiveKit Cloud

## 🎯 Vấn đề
LiveKit Cloud dashboard không cập nhật dữ liệu sau khi chỉnh sửa code.

## ✅ Giải pháp nhanh (3 bước)

### Bước 1: Lấy ngrok URL hiện tại

**Cách 1: Qua script (Khuyến nghị)**
```bash
cd talkplatform-backend
node scripts/check-webhook-url.js
```

**Cách 2: Qua API endpoint**
```bash
curl http://localhost:3000/api/v1/livekit/webhook-status/ngrok-url
```

**Cách 3: Qua ngrok dashboard**
- Mở: http://localhost:4040
- Copy URL từ "Forwarding" section
- Thêm `/webhooks/livekit` vào cuối

### Bước 2: Cập nhật trong LiveKit Cloud

1. **Mở:** https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
2. **Tìm:** "Webhooks" section
3. **Paste URL:** `https://YOUR-NGROK-URL.ngrok-free.app/webhooks/livekit`
4. **Enable events:**
   - ✅ room_started
   - ✅ room_finished  
   - ✅ participant_joined
   - ✅ participant_left
   - ✅ track_published
   - ✅ track_unpublished
5. **Save**

### Bước 3: Test

1. Join một meeting
2. Check backend logs - bạn sẽ thấy:
   ```
   📨 Received LiveKit webhook: room_started
   📨 Received LiveKit webhook: participant_joined
   ```
3. Check LiveKit Cloud dashboard - data sẽ được cập nhật

## 🔍 Nếu vẫn không work

**Check ngrok:**
```bash
curl http://localhost:4040/api/tunnels
```

**Check backend:**
```bash
curl http://localhost:3000/api/v1/livekit/webhook-status/test
```

**Check webhook health:**
```bash
curl http://localhost:3000/api/v1/debug-public/webhook-health
```

## 📋 Checklist

- [ ] Ngrok đang chạy
- [ ] Đã lấy ngrok URL mới
- [ ] Đã cập nhật URL trong LiveKit Cloud
- [ ] Đã enable tất cả events
- [ ] Đã test bằng cách join meeting
- [ ] Backend logs hiển thị webhook events

## 💡 Lưu ý

**Ngrok URL thay đổi mỗi lần restart!** 
- Nếu restart ngrok, phải cập nhật lại URL trong LiveKit Cloud
- Hoặc dùng ngrok static domain (yêu cầu account)

Xem chi tiết: `WEBHOOK_FIX_GUIDE.md`


