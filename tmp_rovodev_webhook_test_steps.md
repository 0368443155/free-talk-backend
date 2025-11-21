# 🚀 WEBHOOK TEST - LÀM NGAY BÂY GIỜ!

## 🔥 QUAN TRỌNG: Cập nhật LiveKit Cloud
1. **Truy cập:** https://cloud.livekit.io/projects/p_3fki8uttl2h/settings
2. **Tìm mục:** Webhooks
3. **Cập nhật URL:** 
   ```
   https://uninstrumental-edwardo-diplostemonous.ngrok-free.dev/webhooks/livekit
   ```
4. **Enable events:**
   - ✅ room_started
   - ✅ room_finished
   - ✅ participant_joined
   - ✅ participant_left
   - ✅ track_published
   - ✅ track_unpublished

## 🎮 TEST NGAY QUA FRONTEND

### Bước 1: Đăng nhập
- Vào: http://localhost:3001/login (hoặc port frontend của bạn)
- Đăng nhập với tài khoản

### Bước 2: Tạo meeting
- Vào: http://localhost:3001/lobby
- Click "Create Room" 
- Tạo free talk room

### Bước 3: Join meeting
- Join vào meeting vừa tạo
- Enable camera/mic

### Bước 4: Xem logs backend
Trong terminal backend, bạn sẽ thấy:
```
📨 Received LiveKit webhook: room_started
🎬 Room started: abc123...
📨 Received LiveKit webhook: participant_joined  
👤 Participant joined: user123
📨 Received LiveKit webhook: track_published
🎥 Track published: video (camera)
```

## 🔍 KIỂM TRA DATA UPDATE

### Option 1: Admin Dashboard (nếu có)
- Vào: http://localhost:3001/admin/livekit

### Option 2: Check database trực tiếp
```sql
SELECT * FROM meetings ORDER BY created_at DESC LIMIT 5;
SELECT * FROM livekit_metrics ORDER BY createdAt DESC LIMIT 10;
```

## 📱 SUCCESS INDICATORS

✅ **Backend logs hiển thị webhook events**
✅ **Meeting status thay đổi thành "live"**  
✅ **current_participants tăng lên**
✅ **Data trong database được update real-time**
✅ **LiveKit Cloud dashboard hiển thị activity**

## 🔧 NẾU VẪN KHÔNG WORK:

1. **Kiểm tra ngrok vẫn chạy:**
   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. **Test webhook trực tiếp:**
   ```bash
   curl https://uninstrumental-edwardo-diplostemonous.ngrok-free.dev/webhooks/livekit
   ```

3. **Check LiveKit Cloud logs** trong dashboard

4. **Verify environment variables:**
   - LIVEKIT_API_KEY đúng
   - LIVEKIT_API_SECRET đúng

## 🎯 MỤC TIÊU
Sau khi làm xong, data sẽ update real-time từ LiveKit Cloud → Backend → Database!