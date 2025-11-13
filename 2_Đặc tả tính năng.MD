### TalkConnect - Bản đặc tả Tính năng Chi tiết (v1)

Tài liệu này mô tả chi tiết các yêu cầu chức năng cho Phiên bản 1 (MVP) của TalkConnect.

## 1. 🎯 Mục tiêu v1

Tạo ra một nền tảng (MVP) nơi người dùng có thể tạo, khám phá và tham gia các phòng chat công khai (chỉ hỗ trợ chat text và các chức năng quản lý cơ bản).

## 2. 👤 Đối tượng Người dùng (Actors)

Guest (Khách): Người dùng chưa đăng nhập.

Authenticated User (Người dùng): Người dùng đã đăng nhập.

Host (Chủ phòng): Người dùng đã tạo ra phòng (là một vai trò của Authenticated User).

## 3. 📖 Đặc tả Tính năng (Feature Specifications)

# F1: Tạo phòng (Room Creation)

User Story: "Là một Người dùng, tôi muốn tạo một phòng trò chuyện mới với các tùy chọn cơ bản (tên, ngôn ngữ, giới hạn) để người khác có thể thấy và tham gia."

Actor: Authenticated User

Giao diện (Đề xuất): Một Modal (cửa sổ pop-up) "Tạo phòng mới".

API liên quan: POST /rooms

Yêu cầu nghiệp vụ (Acceptance Criteria):

Người dùng phải đăng nhập (được bảo vệ bởi JwtAuthGuard).

Input (DTO: CreateRoomDto) phải được xác thực (validate):

title: Bắt buộc, chuỗi, tối thiểu 3 ký tự, tối đa 100 ký tự.

language: Tùy chọn, chuỗi (ví dụ: 'en', 'vi', 'es').

topic: Tùy chọn, chuỗi (ví dụ: 'ielts', 'gaming').

max_participants: Bắt buộc, số nguyên, tối thiểu 2, tối đa 10 (cấu hình).

Khi thực hiện thành công (Logic Service):

Hệ thống phải tạo một record mới trong bảng Rooms.

status của phòng mới phải được đặt là LIVE.

host_id của phòng mới phải là id của người dùng tạo.

Hệ thống phải tự động tạo một record trong RoomParticipants liên kết userId này với roomId mới, và gán role = 'HOST'.

Hệ thống phải PUBLISH một sự kiện room:created lên kênh Redis (để kích hoạt F3).

Khi thực hiện thất bại (Validation):

Trả về lỗi 400 Bad Request nếu input không hợp lệ.

Trả về lỗi 401 Unauthorized nếu người dùng chưa đăng nhập.

# F2: Khám phá phòng (Room Discovery)

User Story: "Là một Guest hoặc User, tôi muốn xem danh sách các phòng đang hoạt động để tôi có thể chọn một phòng để tham gia."

Actor: Guest, Authenticated User

Giao diện (Đề xuất): Trang chủ (Sảnh chờ - Lobby) hiển thị danh sách các phòng.

API liên quan: GET /rooms

Yêu cầu nghiệp vụ (Acceptance Criteria):

Endpoint này phải public (không yêu cầu JwtAuthGuard).

Chỉ trả về các phòng có status = 'LIVE'.

Kết quả phải được sắp xếp theo created_at DESC (phòng mới nhất lên đầu).

Hỗ trợ phân trang (Pagination):

Query params: ?page=1, ?limit=20.

Phải trả về total (tổng số phòng) và data (danh sách phòng).

Hỗ trợ lọc (Filter):

Query params: ?language=en, ?topic=gaming.

Hệ thống phải lọc kết quả dựa trên các query param này.

Phải trả về số lượng người tham gia hiện tại cho mỗi phòng (nên cache trong Redis để tối ưu).

# F3: Cập nhật Sảnh chờ Real-time (Lobby Real-time Update)

User Story: "Là một User đang ở sảnh chờ, tôi muốn danh sách phòng tự động cập nhật (thêm hoặc xóa) ngay khi có phòng mới được tạo hoặc phòng cũ kết thúc, mà không cần tải lại trang."

Actor: Authenticated User

Giao diện (Đề xuất): Logic của component Sảnh chờ (RoomDiscovery.tsx).

Socket.IO liên quan: Event room:list-update (Server-to-Client)

Yêu cầu nghiệp vụ (Acceptance Criteria):

Client (Frontend) khi ở Sảnh chờ phải kết nối Socket.IO và lắng nghe sự kiện room:list-update.

Khi một phòng mới được tạo (logic F1), RoomsGateway (sau khi nhận sự kiện Pub/Sub từ Redis) phải emit sự kiện room:list-update cho tất cả client không ở trong phòng (tức là ở sảnh chờ).

Payload: { action: 'created', room: <RoomData> }

Khi một phòng kết thúc (logic F5), RoomsGateway phải emit sự kiện room:list-update.

Payload: { action: 'ended', room: <RoomData> }

Logic Frontend:

Khi nhận created, thêm room vào đầu danh sách rooms.

Khi nhận ended, lọc bỏ room ra khỏi danh sách rooms (dựa trên room.id).

# F4: Tham gia phòng (Join Room)

User Story: "Là một User, tôi muốn tham gia một phòng từ Sảnh chờ."

Actor: Authenticated User

Giao diện (Đề xuất): Click vào nút "Join" trên một thẻ phòng ở Sảnh chờ.

API liên quan: POST /rooms/:roomId/join

Yêu cầu nghiệp vụ (Acceptance Criteria):

Người dùng phải đăng nhập (JwtAuthGuard).

Hệ thống phải kiểm tra (Validation Logic 4 bước):

Tồn tại: Phòng (roomId) phải tồn tại trong CSDL.

Trạng thái: Phòng phải có status = 'LIVE'. Nếu ENDED, trả về lỗi 404.

Bị Kick: Người dùng (userId) không được có bản ghi RoomParticipants với is_kicked = 1 cho roomId này. Nếu có, trả về lỗi 403 Forbidden ("Bạn đã bị kick").

Phòng đầy: Đếm số lượng RoomParticipants hiện tại của phòng. Nếu số lượng >= max_participants, trả về lỗi 403 Forbidden ("Phòng đã đầy").

Khi thành công:

Hệ thống tạo một record RoomParticipants mới (với role = 'PARTICIPANT').

API trả về 200 OK (hoặc 201 Created) với thông tin phòng (hoặc token tham gia).

Logic Frontend (Sau khi Join thành công):

Chuyển hướng người dùng đến trang /rooms/:roomId.

Trang này sẽ emit sự kiện Socket.IO room:join để thông báo cho những người khác.

# F5: Rời phòng & Tự động dọn dẹp (Leave Room & Auto-Cleanup)

User Story 1: "Là một User trong phòng, tôi muốn rời khỏi phòng."

User Story 2: "Là một Host, khi tôi là người cuối cùng rời đi, tôi muốn phòng tự động đóng lại."

Actor: Authenticated User

Giao diện (Đề xuất): Nút "Rời phòng".

API liên quan: POST /rooms/:roomId/leave

Socket.IO liên quan: handleDisconnect, @SubscribeMessage('room:leave')

Yêu cầu nghiệp vụ (Acceptance Criteria):

Rời chủ động:

Người dùng click "Rời phòng", frontend gọi POST /rooms/:roomId/leave (hoặc socket.emit('room:leave')).

Server cập nhật RoomParticipants (set left_at hoặc xóa record).

Server emit('room:user-left', { userId }) cho những người còn lại trong phòng.

Mất kết nối:

RoomsGateway bắt sự kiện handleDisconnect().

Gateway phải xác định userId và roomId mà socket này đã tham gia (lưu state khi join).

Thực hiện logic tương tự như "Rời chủ động".

Tự động dọn dẹp (Logic checkAndEndRoom()):

Logic này phải được kích hoạt sau khi "Rời chủ động" hoặc "Mất kết nối".

Service đếm số lượng RoomParticipants còn lại trong roomId (những người chưa left_at).

Nếu Count = 0:

Hệ thống phải cập nhật Rooms.status = ENDED.

Hệ thống phải PUBLISH sự kiện room:ended lên Redis (để kích hoạt F3).

Nếu Count > 0 VÀ người rời đi là Host:

Hệ thống phải chỉ định một người tham gia lâu năm nhất làm Host mới (Logic v2 - v1 có thể bỏ qua và phòng kết thúc).

# F6: Chat văn bản (Text Chat)

User Story: "Là một User trong phòng, tôi muốn gửi và nhận tin nhắn văn bản để giao tiếp với những người khác."

Actor: Authenticated User (đã tham gia phòng)

Giao diện (Đề xuất): Khung chat trong RoomView.tsx.

API liên quan: GET /rooms/:roomId/chat

Socket.IO liên quan: chat:message

Yêu cầu nghiệp vụ (Acceptance Criteria):

Lấy lịch sử:

Khi Frontend (RoomView) tải, nó phải gọi GET /rooms/:roomId/chat.

API trả về 50 tin nhắn cuối cùng (hoặc phân trang).

Gửi tin nhắn:

Người dùng nhập tin nhắn và nhấn Enter.

Frontend emit('chat:message', { roomId, message: '...' }).

Nhận tin nhắn (Gateway Logic):

RoomsGateway bắt sự kiện chat:message.

Xác thực người gửi (client.user.id).

Lưu tin nhắn vào CSDL (RoomChatMessages).

Broadcast (client.to(roomId).emit(...)) sự kiện chat:message cho tất cả mọi người trong roomId (bao gồm cả người gửi).

Payload phải chứa thông tin người gửi: { message: '...', sender: { id, username, avatar_url } }.

# F7: Quyền Host - Kick (Host Control - Kick)

User Story: "Là một Host, tôi muốn kick một người dùng phiền nhiễu ra khỏi phòng của tôi."

Actor: Host

Giao diện (Đề xuất): Nút "Kick" bên cạnh tên người dùng trong danh sách Participants.

API liên quan: POST /rooms/:roomId/kick/:userId

Socket.IO liên quan: room:user-kicked (Server-to-Client)

Yêu cầu nghiệp vụ (Acceptance Criteria):

Hiển thị (Frontend):

Frontend phải kiểm tra currentUser.id === room.host_id.

Nếu đúng, hiển thị nút "Kick" bên cạnh tất cả người tham gia khác (trừ chính Host).

Gọi API:

Khi Host click "Kick", Frontend gọi POST /rooms/:roomId/kick/:targetUserId.

Xử lý (Backend):

API (RoomsController) phải bảo vệ bằng JwtAuthGuard.

Service (kickParticipant) phải kiểm tra request.user.id (Host) có phải là host_id của phòng không.

Nếu đúng, Service cập nhật RoomParticipants của targetUserId thành is_kicked = 1.

Thông báo (Real-time):

Sau khi cập nhật CSDL, RoomsGateway phải emit('room:user-kicked', { userId: targetUserId }) cho tất cả mọi người trong phòng (bao gồm cả người bị kick).

Xử lý (Frontend):

Tất cả client nhận room:user-kicked, lọc user đó ra khỏi danh sách participants.

Client của người bị kick, khi nhận được sự kiện này, phải hiển thị thông báo "Bạn đã bị kick" và tự động điều hướng về Sảnh chờ.

Logic (F4) sẽ ngăn người này tham gia lại.