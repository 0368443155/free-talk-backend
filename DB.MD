## 1.Bảng Users: Thêm vào để làm bảng tham chiếu chính cho host_id và user_id.

# 2. Kiểu dữ liệu:

    -- **UUID được biểu diễn bằng CHAR(36).
    -- **boolean được biểu diễn bằng TINYINT(1) (với 0 là false, 1 là true).
    -- **enum được sử dụng cho các trường status và role đúng như trong README.md.
# 3. Khóa ngoại (Foreign Keys):
    -- **Rooms.host_id -> Users.id.

RoomParticipants.room_id -> Rooms.id (thiết lập ON DELETE CASCADE như trong README.md để khi một phòng bị xóa, tất cả bản ghi tham gia cũng bị xóa).

RoomParticipants.user_id -> Users.id.

RoomChatMessages.room_id -> Rooms.id (cũng ON DELETE CASCADE).

# 4. Indexes (Chỉ mục):

Thêm idx_status_language trên bảng Rooms để tối ưu hóa truy vấn "Room Discovery" (GET /rooms).

Thêm idx_chat_room_id trên bảng RoomChatMessages để tải lịch sử chat của phòng nhanh hơn.

# 5. Ràng buộc (Constraint):

Thêm UNIQUE KEY (uq_room_user) vào bảng RoomParticipants để đảm bảo một người dùng không thể tham gia cùng một phòng 2 lần (ở 2 hàng khác nhau).