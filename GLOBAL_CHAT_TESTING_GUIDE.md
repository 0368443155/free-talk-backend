# Global Chat - Hướng dẫn Test và Xác minh

## ✅ Các tính năng đã được cải thiện

### 1. **Giao diện hiện đại và thân thiện**
- ✨ Gradient backgrounds đẹp mắt
- 🎨 Tin nhắn của người gửi hiển thị bên phải với màu xanh gradient
- 👤 Avatar cho mỗi tin nhắn với fallback initials
- 🔵 Indicator cho tin nhắn đang gửi (loading) và đã gửi (checkmark)
- 💬 Animation mượt mà khi tin nhắn xuất hiện
- 🎭 Hover effects và transitions

### 2. **Real-time messaging**
- ⚡ Socket.IO connection với auto-reconnect
- 📤 Optimistic updates - tin nhắn hiển thị ngay lập tức
- 📥 Server broadcast đến tất cả users
- 🔄 Merge optimistic messages với server messages
- 🚫 Ngăn chặn tin nhắn trùng lặp

### 3. **Message persistence**
- 💾 Tin nhắn được lưu vào PostgreSQL database
- 📜 Load lại tin nhắn khi vào trang (100 tin nhắn gần nhất)
- 🧹 Auto cleanup tin nhắn cũ hơn 24 giờ (cron job)

### 4. **User experience**
- ⌨️ Typing indicators
- 😊 Emoji picker
- 🔔 Connection status indicator
- ⏰ Timestamp cho mỗi tin nhắn
- 📱 Responsive design

## 🧪 Hướng dẫn Test

### Test 1: Gửi và nhận tin nhắn cơ bản

1. **Mở dashboard** (`http://localhost:3001/dashboard`)
2. **Kiểm tra connection status**:
   - Header phải hiển thị "Connected" với dot xanh
   - Nếu "Connecting..." thì đợi vài giây

3. **Gửi tin nhắn**:
   - Nhập tin nhắn vào input box
   - Nhấn Enter hoặc click nút Send
   - **Kết quả mong đợi**:
     - Tin nhắn xuất hiện ngay lập tức bên phải
     - Màu xanh gradient (bg-gradient-to-br from-blue-600 to-blue-700)
     - Avatar của bạn ở bên phải
     - Username hiển thị là "You"
     - Loading indicator → checkmark khi server confirm

### Test 2: Tin nhắn từ người khác

1. **Mở tab mới** (incognito hoặc browser khác)
2. **Login với user khác**
3. **Gửi tin nhắn từ user thứ 2**
4. **Kiểm tra ở tab đầu tiên**:
   - **Kết quả mong đợi**:
     - Tin nhắn xuất hiện bên trái
     - Màu xám (bg-gray-800)
     - Avatar của người gửi ở bên trái
     - Username hiển thị tên người gửi

### Test 3: Persistence (Lưu trữ tin nhắn)

1. **Gửi vài tin nhắn**
2. **Refresh trang** (F5)
3. **Kết quả mong đợi**:
   - Tin nhắn vẫn hiển thị sau khi refresh
   - Tin nhắn của bạn vẫn ở bên phải với màu xanh
   - Tin nhắn của người khác vẫn ở bên trái

### Test 4: Typing indicator

1. **Mở 2 tabs với 2 users khác nhau**
2. **Bắt đầu gõ ở tab 1** (không gửi)
3. **Kiểm tra tab 2**:
   - **Kết quả mong đợi**:
     - Header hiển thị "[Username] typing..." với animation dots

### Test 5: Emoji picker

1. **Click vào icon mặt cười** (😊)
2. **Chọn một emoji**
3. **Kết quả mong đợi**:
   - Emoji được thêm vào input
   - Popup đóng lại
   - Focus quay lại input

### Test 6: Connection handling

1. **Tắt backend server** (Ctrl+C)
2. **Kiểm tra UI**:
   - Banner vàng "Reconnecting to chat..."
   - Input bị disable
3. **Bật lại backend**
4. **Kết quả mong đợi**:
   - Auto reconnect sau vài giây
   - Banner biến mất
   - Input enable lại

## 🔍 Debug và Troubleshooting

### Kiểm tra Console Logs

Mở Developer Console (F12) và tìm các logs:

#### Frontend logs:
```
✅ Global chat socket connected successfully
📤 Sending optimistic message: { tempId, userId, username, message }
📥 Received message from server: { id, senderId, senderName, message }
🔄 Replacing optimistic message: { tempId, realId, message }
➕ Adding new message to list
🔍 Message ownership check: { messageId, messageSenderId, currentUserId, isMatch }
```

#### Backend logs:
```
✅ User connected to global chat: [username] (socketId)
💬 Global chat message sent by [username]: [message]
👋 User disconnected from global chat: [username]
```

### Các vấn đề thường gặp

#### 1. Tin nhắn của mình không hiển thị bên phải
**Nguyên nhân**: `user_id` không khớp giữa frontend và backend

**Kiểm tra**:
```javascript
// Trong console, check:
console.log('Current user:', user.id, user.user_id);
```

**Giải pháp**: Đã được fix trong `isMessageFromCurrentUser()` function

#### 2. Tin nhắn bị trùng lặp
**Nguyên nhân**: Optimistic message không được merge với server message

**Kiểm tra**: Xem console logs cho "🔄 Replacing optimistic message"

**Giải pháp**: Đã được fix trong `handleChatMessage()` với matching logic

#### 3. Socket không kết nối
**Nguyên nhân**: Backend chưa chạy hoặc URL sai

**Kiểm tra**:
```bash
# Check backend
cd talkplatform-backend
npm run start:dev

# Check .env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

#### 4. Tin nhắn không load khi refresh
**Nguyên nhân**: API fetch failed hoặc database issue

**Kiểm tra**:
```bash
# Check database
psql -U postgres -d talkplatform
SELECT * FROM global_chat_messages ORDER BY created_at DESC LIMIT 10;
```

## 📊 Database Schema

```sql
-- Table: global_chat_messages
CREATE TABLE global_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  room_type VARCHAR(50) DEFAULT 'lobby',
  is_system_message BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_global_chat_created_at ON global_chat_messages(created_at);
CREATE INDEX idx_global_chat_user_created ON global_chat_messages(user_id, created_at);
```

## 🎨 UI Components

### Message Layout

```
┌─────────────────────────────────────────┐
│ [Avatar] Username          10:30 AM     │ ← Other's message (left)
│          ┌─────────────────────┐        │
│          │ Message content     │        │
│          └─────────────────────┘        │
│                                         │
│              You          10:31 AM      │ ← Your message (right)
│       ┌─────────────────────┐ [Avatar] │
│       │ Message content     │✓✓        │
│       └─────────────────────┘           │
└─────────────────────────────────────────┘
```

### Color Scheme

- **Your messages**: `bg-gradient-to-br from-blue-600 to-blue-700`
- **Others' messages**: `bg-gray-800 border border-gray-700`
- **System messages**: `bg-gray-800/50 backdrop-blur-sm`
- **Header**: `bg-gradient-to-r from-gray-800 to-gray-900`
- **Input area**: `bg-gray-900`

## 🚀 Performance

- **Message limit**: 200 messages in memory
- **Auto cleanup**: Messages older than 24 hours
- **Optimistic updates**: Instant UI feedback
- **Socket reconnection**: Max 3 attempts with exponential backoff

## 📝 Next Steps (Optional Enhancements)

1. **Message reactions** (👍, ❤️, 😂)
2. **Reply to messages**
3. **File/image sharing**
4. **Message search**
5. **User mentions** (@username)
6. **Message editing/deletion**
7. **Read receipts**
8. **Online users list**
9. **Private messages**
10. **Message notifications**

## ✅ Checklist

- [x] Socket connection hoạt động
- [x] Tin nhắn gửi/nhận real-time
- [x] Tin nhắn của người gửi hiển thị bên phải
- [x] Màu sắc khác biệt (xanh vs xám)
- [x] Avatar hiển thị
- [x] Timestamp hiển thị
- [x] Typing indicator
- [x] Emoji picker
- [x] Message persistence
- [x] Optimistic updates
- [x] No duplicate messages
- [x] Auto-scroll
- [x] Connection status
- [x] Responsive design
- [x] Error handling
- [x] Loading states

---

**Tác giả**: Antigravity AI
**Ngày cập nhật**: 2025-11-25
