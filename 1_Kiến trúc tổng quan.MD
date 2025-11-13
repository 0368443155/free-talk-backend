## Kiến trúc Hệ thống TalkConnect (Free4talk Clone)

# 1. Tổng quan yêu cầu

Hệ thống cho phép người dùng tạo và tham gia các phòng trò chuyện video/audio công khai.

Chức năng cốt lõi:

✅ Tạo phòng (Room Creation): Bất kỳ người dùng nào cũng có thể tạo phòng.

✅ Tùy chỉnh phòng: Host đặt Tên phòng, Chủ đề, Ngôn ngữ, Giới hạn người tham gia (ví dụ: 6 người).

✅ Khám phá phòng (Room Discovery): Trang chủ hiển thị danh sách các phòng đang LIVE, có thể lọc.

✅ Tham gia/Rời phòng (Join/Leave): Người dùng tham gia bất kỳ phòng nào còn chỗ.

✅ Giao tiếp: Voice/Video call (WebRTC) và Text Chat trong phòng.

✅ Quyền Host: Host có quyền cơ bản (Kick user).

✅ Tự động dọn dẹp: Phòng tự động ENDED khi không còn ai.

✅ Scalable: Hệ thống phải có khả năng mở rộng.

# 2. Công nghệ đề xuất (Scalable Solution)

A. WebRTC: Peer-to-peer audio/video streaming (Low latency).

B. Mediasoup (SFU - Selective Forwarding Unit): Media server để scale WebRTC cho phòng > 2 người, tối ưu bandwidth.

C. Socket.IO: Real-time (Signaling, chat, sự kiện cập nhật danh sách phòng).

D. Redis:

Quản lý State (ai đang ở phòng nào, số lượng người trong phòng).

Pub/Sub: Đồng bộ sự kiện (tạo/kết thúc phòng) giữa nhiều server.

Scaling Socket.IO (dùng Redis Adapter).

E. NestJS (Backend): API server, quản lý logic.

F. PostgreSQL / MySQL: Lưu trữ thông tin (Users, Rooms).

# 3. Kiến trúc hệ thống (Sơ đồ)

┌─────────────────────────────────────────────────────────────┐
│                       Load Balancer                         │
│                     (Nginx / AWS ALB)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐   ┌──────▼────────┐
│  NestJS API  │   │  NestJS API   │   (Horizontal Scaling)
│  Server 1    │   │  Server 2     │
└───────┬──────┘   └──────┬────────┘
        │                 │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  Redis Cluster  │   (Pub/Sub + Session + State)
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │    Database     │   (PostgreSQL / MySQL)
        └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Mediasoup Servers (Workers)                   │
│         (Các server riêng biệt để xử lý media)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TURN/STUN Servers (coturn)                     │
│               (Để xử lý NAT traversal)                      │
└─────────────────────────────────────────────────────────────┘


# 4. Database Schema (MySQL)

-- (Chi tiết xem trong file talkconnect_schema.sql)

-- Users
CREATE TABLE `Users` (
  `id` CHAR(36) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  ...
);

-- Rooms
CREATE TABLE `Rooms` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `topic` VARCHAR(255) DEFAULT NULL,
  `language` VARCHAR(10) DEFAULT NULL,
  `host_id` CHAR(36) NOT NULL,
  `max_participants` TINYINT UNSIGNED NOT NULL DEFAULT 6,
  `status` ENUM('LIVE', 'ENDED') NOT NULL DEFAULT 'LIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_rooms_host_id` FOREIGN KEY (`host_id`) REFERENCES `Users` (`id`)
);

-- RoomParticipants
CREATE TABLE `RoomParticipants` (
  `id` CHAR(36) NOT NULL,
  `room_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('HOST', 'PARTICIPANT') NOT NULL DEFAULT 'PARTICIPANT',
  `is_muted` TINYINT(1) NOT NULL DEFAULT 0,
  `is_video_off` TINYINT(1) NOT NULL DEFAULT 0,
  `is_kicked` TINYINT(1) NOT NULL DEFAULT 0,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_user` (`room_id`, `user_id`),
  CONSTRAINT `fk_participants_room_id` FOREIGN KEY (`room_id`) REFERENCES `Rooms` (`id`) ON DELETE CASCADE
);

-- RoomChatMessages
CREATE TABLE `RoomChatMessages` (
  `id` CHAR(36) NOT NULL,
  `room_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `message_text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_chat_room_id` FOREIGN KEY (`room_id`) REFERENCES `Rooms` (`id`) ON DELETE CASCADE
);


# 5. Luồng Logic Chính (Core Logic)

A. Tạo phòng (Create Room)

User gọi POST /rooms.

Server tạo Room (status: LIVE) và RoomParticipant (role: HOST).

Server PUBLISH sự kiện room:created lên Redis.

B. Hiển thị phòng (Room Discovery)

User gọi GET /rooms?status=LIVE.

Server trả về danh sách phòng.

Client lắng nghe Socket.IO room:list-update để cập nhật real-time.

C. Tham gia phòng (Join Room)

User gọi POST /rooms/:roomId/join.

Server kiểm tra: Phòng LIVE? Phòng đầy? User bị kick?

Nếu OK, server tạo RoomParticipant (role: PARTICIPANT).

Client kết nối Socket.IO socket.join(roomId).

D. Kết thúc phòng (Auto-End)

User leave hoặc disconnect.

Server kiểm tra số người còn lại trong phòng (nên cache trong Redis).

Nếu = 0:

Server cập nhật Room status thành ENDED.

Server PUBLISH sự kiện room:ended lên Redis.

# 6. API Endpoints (REST)

// Room Management
POST   /rooms             // Tạo phòng mới (yêu cầu login)
GET    /rooms             // Lấy danh sách phòng (public, live, có filter)
GET    /rooms/:roomId     // Lấy chi tiết 1 phòng
DELETE /rooms/:roomId     // Xóa phòng (chỉ host)

// Participation
POST   /rooms/:roomId/join  // Tham gia phòng
POST   /rooms/:roomId/leave // Rời phòng

// Host Controls
POST   /rooms/:roomId/kick/:userId   // Kick user (chỉ host)

// Chat
GET    /rooms/:roomId/chat  // Lấy lịch sử chat

# 7. Socket.IO Events

Client → Server (Client gửi lên)

'room:join': ({ roomId })        // Tham gia phòng
'room:leave': ({ roomId })       // Rời phòng
'chat:message': ({ message })    // Gửi tin nhắn
'webrtc:offer': ({ sdp, targetUserId })
'webrtc:answer': ({ sdp, targetUserId })
'webrtc:ice-candidate': ({ candidate, targetUserId })
'media:toggle-mic': ({ isMuted })
'media:toggle-video': ({ isVideoOff })
'hand:raise': ()


Server → Client (Server gửi xuống)

// Gửi cho TẤT CẢ user ở sảnh chờ (Lobby)
'room:list-update': ({ action: 'created' | 'ended', room: Room })

// Gửi cho user TRONG PHÒNG
'room:user-joined': ({ user, participant })
'room:user-left': ({ userId })
'room:user-kicked': ({ userId })
'chat:message': ({ message, sender })
'webrtc:offer': ({ sdp, senderUserId })
'webrtc:answer': ({ sdp, senderUserId })
'webrtc:ice-candidate': ({ candidate, senderUserId })
'media:user-muted': ({ userId, isMuted })
'hand:raised': ({ userId })


# 8. Scalability (Redis Pub/Sub)

Để đồng bộ danh sách phòng (Room Discovery) giữa nhiều server:

Server 1 (API) tạo Room 101.

Server 1 PUBLISH "room:created" lên kênh Redis.

Server 2, 3, 4 (Socket.IO) đang SUBSCRIBE kênh này.

Cả 3 server nhận được tin nhắn và emit('room:list-update', ...) tới các client đang kết nối với chúng.

Tất cả user ở sảnh chờ đều thấy Room 101 ngay lập tức.

# 9. Security Considerations

✅ JWT authentication cho cả API & Socket.IO.

✅ Rate Limiting (dùng Redis) cho API (ví dụ: tạo phòng, join).

✅ CORS configuration.

✅ HTTPS/WSS (SSL)

✅ End-to-end encryption (WebRTC native).

✅ Input validation (dùng DTOs).