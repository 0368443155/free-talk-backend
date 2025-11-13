Lộ trình Dự án TalkConnect (Project Roadmap)

Lộ trình này được xây dựng dựa trên "Bản đặc tả Tính năng Chi tiết (v1)" và chia dự án thành các giai đoạn có thể quản lý được.

Giai đoạn 0: Khởi tạo & Nền tảng (Tuần 1-2)

Mục tiêu: Thiết lập môi trường, cơ sở dữ liệu và xác thực người dùng.

Tuần 1: Cài đặt & Backend Core

[ ] Khởi tạo dự án NestJS (Backend).

[ ] Khởi tạo dự án Next.js/React (Frontend).

[ ] Cài đặt các thư viện cơ bản (TypeORM, Passport, Socket.IO, class-validator).

[ ] Thiết lập kết nối CSDL (MySQL) và Redis.

[ ] (Database) Thiết kế và chạy migration cho 4 bảng: Users, Rooms, RoomParticipants, RoomChatMessages (dựa trên talkconnect_schema.sql).

Tuần 2: Xác thực & User

[ ] (Backend) Implement Module Auth:

[ ] POST /auth/register (Tạo người dùng).

[ ] POST /auth/login (Tạo JWT Token).

[ ] (Backend) Implement JwtAuthGuard (cho API) và WsJwtGuard (cho Socket.IO).

[ ] (Frontend) Tạo trang Login / Register.

[ ] (Frontend) Xử lý lưu JWT token (vào Context hoặc localStorage).

Giai đoạn 1: MVP Backend - Logic nghiệp vụ (Tuần 3-4)

Mục tiêu: Hoàn thành tất cả các REST API cần thiết cho v1 (ngoại trừ real-time).

Tuần 3: Logic Phòng (Room Logic)

[ ] (Backend) [F1] Implement POST /rooms (Tạo phòng).

Phải bao gồm logic tạo Room và RoomParticipant (vai trò HOST).

[ ] (Backend) [F2] Implement GET /rooms (Khám phá phòng).

Phải bao gồm logic lọc (status='LIVE'), phân trang, và sắp xếp.

[ ] (Backend) Implement GET /rooms/:roomId (Chi tiết phòng).

Tuần 4: Logic Tham gia & Quản lý (Join & Management)

[ ] (Backend) [F4] Implement POST /rooms/:roomId/join (Tham gia phòng).

Phải bao gồm logic validation 4 bước (tồn tại, status, bị kick, phòng đầy).

[ ] (Backend) [F7] Implement POST /rooms/:roomId/kick/:userId (Kick user).

Phải bao gồm logic kiểm tra quyền Host và cập nhật is_kicked=1.

[ ] (Backend) [F6] Implement GET /rooms/:roomId/chat (Lấy lịch sử chat).

[ ] (Backend) Implement POST /rooms/:roomId/leave (Rời phòng chủ động).

Giai đoạn 2: MVP Backend - Real-time (Tuần 5-6)

Mục tiêu: Tích hợp Socket.IO và Redis Pub/Sub để làm cho ứng dụng "sống".

Tuần 5: Socket & Redis Scaling

[ ] (Backend) Cấu hình RoomsGateway (Socket.IO Gateway).

[ ] (Backend) Tích hợp RedisIoAdapter (cho phép scaling nhiều server).

[ ] (Backend) [F3] Implement Redis Pub/Sub:

[ ] RoomsService (khi tạo/kết thúc phòng) PUBLISH sự kiện.

[ ] RoomsGateway SUBSCRIBE sự kiện và emit('room:list-update').

Tuần 6: Sự kiện Real-time

[ ] (Backend) [F5] Implement handleDisconnect (tự động rời phòng).

[ ] (Backend) [F5] Hoàn thiện checkAndEndRoom() (logic tự động đóng phòng khi 0 người).

[ ] (Backend) Implement @SubscribeMessage('room:join') và emit('room:user-joined').

[ ] (Backend) Implement @SubscribeMessage('room:leave') và emit('room:user-left').

[ ] (Backend) [F6] Implement @SubscribeMessage('chat:message') (lưu CSDL và broadcast).

[ ] (Backend) [F7] Hoàn thiện logic kick (sau khi API cập nhật CSDL, emit('room:user-kicked')).

Giai đoạn 3: MVP Frontend - Giao diện & Tương tác (Tuần 7-8)

Mục tiêu: Xây dựng giao diện người dùng hoàn chỉnh cho v1 (chỉ chat text).

Tuần 7: Sảnh chờ & Tạo phòng (Lobby)

[ ] (Frontend) Tạo SocketProvider để quản lý kết nối Socket.IO.

[ ] (Frontend) [F2] Tạo Component RoomDiscovery.tsx (Sảnh chờ).

[ ] Gọi API GET /rooms để hiển thị danh sách ban đầu.

[ ] (Frontend) [F3] Tích hợp socket.on('room:list-update') vào RoomDiscovery (tự động cập nhật UI).

[ ] (Frontend) [F1] Tạo Modal/Component "Tạo phòng" (gọi POST /rooms).

Tuần 8: Trong phòng (Room View)

[ ] (Frontend) [F4] Xử lý logic tham gia phòng (gọi POST /.../join, sau đó chuyển trang sang /rooms/:id).

[ ] (Frontend) Tạo Component RoomView.tsx (layout chính của phòng).

[ ] (Frontend) [F6] Tạo Component ChatPanel.tsx:

[ ] GET /.../chat (lấy lịch sử).

[ ] emit('chat:message') (gửi tin).

[ ] on('chat:message') (nhận tin).

[ ] (Frontend) [F5/F7] Tạo Component ParticipantsPanel.tsx:

[ ] on('room:user-joined'), on('room:user-left') (cập nhật danh sách).

[ ] on('room:user-kicked') (xử lý bị kick hoặc thấy người khác bị kick).

[ ] Hiển thị nút "Kick" (cho Host) và nút "Rời phòng".

Hoàn thành Giai đoạn 3: Đã có MVP v1 (Chat Text) hoạt động.

Giai đoạn 4: Tích hợp WebRTC (v2) (Tuần 9-10)

Mục tiêu: Thêm tính năng video/audio (phần khó nhất).

Tuần 9: Cài đặt Media Server

[ ] (DevOps) Cài đặt và cấu hình TURN/STUN Server (ví dụ: coturn).

[ ] (Backend) Cài đặt Mediasoup (thư viện).

[ ] (Backend) Thiết lập MediasoupWorker (các tiến trình xử lý media).

[ ] (Backend) Mở rộng RoomsService để quản lý Mediasoup Routers cho mỗi phòng.

Tuần 10: Logic Signaling & Frontend

[ ] (Backend) Implement các Socket.IO events (WebRTC signaling):

[ ] get-router-rtp-capabilities

[ ] create-webrtc-transport

[ ] connect-webrtc-transport

[ ] produce (bắt đầu gửi video/audio)

[ ] consume (nhận video/audio từ người khác)

[ ] (Frontend) Tích hợp mediasoup-client.

[ ] (Frontend) Viết logic WebRTCClient (xử lý toàn bộ logic signaling).

[ ] (Frontend) Tạo các <video> elements và gắn MediaStream vào.

[ ] (Frontend) Implement media:toggle-mic, media:toggle-video (gửi event lên server).

Giai đoạn 5: Hoàn thiện v2 & Triển khai (Tuần 11-12)

Mục tiêu: Hoàn thiện các tính năng nâng cao và đưa lên production.

Tuần 11: Tính năng nâng cao

[ ] (Backend+Frontend) Implement Screen Sharing (dùng Mediasoup).

[ ] (Backend+Frontend) Implement Host Mute (Host emit sự kiện, Server broadcast cho client bị mute).

[ ] (Backend+Frontend) Implement Reactions (👍, ❤️) (dùng Socket.IO).

Tuần 12: Tối ưu & Triển khai

[ ] (Frontend) Hoàn thiện UI/UX.

[ ] (Backend) Tối ưu CSDL (đánh index).

[ ] (Backend) Tối ưu Redis (cache số lượng người trong phòng).

[ ] (DevOps) Viết kịch bản Deployment (ví dụ: Docker Compose).

[ ] (QA) Test tải (Load Testing) và Sửa lỗi.

[ ] TRIỂN KHAI LÊN PRODUCTION.