# NOTIFICATION SYSTEM & MEETING STATE TRACKING - IMPLEMENTATION

**Ngày hoàn thành:** 03/12/2025  
**Trạng thái:** ✅ Completed

---

## ✅ ĐÃ HOÀN THÀNH

### 1. Notification System với Bull Queue

#### Files đã tạo:

1. **Notification Entity**
   - `src/features/notifications/entities/notification.entity.ts`
   - Lưu trữ notifications với types: EMAIL, IN_APP, PUSH
   - Status: PENDING, SENT, FAILED

2. **Notification Service**
   - `src/features/notifications/notification.service.ts`
   - Gửi notifications qua Bull queue (async)
   - Methods: `send()`, `sendBatch()`, `getUserNotifications()`, `markAsRead()`

3. **Notification Processor**
   - `src/features/notifications/notification.processor.ts`
   - Worker xử lý jobs từ queue
   - Xử lý EMAIL, IN_APP, PUSH notifications

4. **Reminder Service**
   - `src/features/schedules/reminder.service.ts`
   - Cron job chạy mỗi phút
   - Gửi reminder 20 phút trước khi lớp bắt đầu
   - Gửi cho cả teacher và students

5. **Notifications Module**
   - `src/features/notifications/notifications.module.ts`
   - Module setup với Bull queue

6. **Notifications Controller**
   - `src/features/notifications/notifications.controller.ts`
   - API endpoints: GET /notifications, PATCH /notifications/:id/read

---

### 2. Meeting Entity State Tracking

#### Files đã cập nhật:

1. **Meeting Entity**
   - `src/features/meeting/entities/meeting.entity.ts`
   - Thêm fields:
     - `opened_at`: Thời gian meeting được mở
     - `closed_at`: Thời gian meeting được đóng
     - `auto_opened`: Boolean - True nếu mở tự động
     - `auto_closed`: Boolean - True nếu đóng tự động

2. **Meeting Scheduler Service**
   - `src/features/meeting/meeting-scheduler.service.ts`
   - Cập nhật `openMeeting()` và `closeMeeting()` để track state
   - Set `auto_opened` và `auto_closed` flags

3. **Migration**
   - `src/database/migrations/1767000000001-AddMeetingStateTracking.ts`
   - Thêm columns và indexes

---

## 📋 CÁCH SỬ DỤNG

### 1. Notification System

#### Gửi Notification

```typescript
// Trong service
await this.notificationService.send({
  userId: 'user-id',
  type: NotificationType.EMAIL,
  title: '⏰ Class starting in 20 minutes',
  message: 'Your class will start in 20 minutes.',
  data: { meetingId: 'meeting-id' },
  actionUrl: 'https://app.com/meetings/meeting-id',
});
```

#### Lấy Notifications

```typescript
// API call
GET /api/v1/notifications?limit=50
```

#### Đánh dấu đã đọc

```typescript
// API call
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

---

### 2. Reminder Service

Reminder service tự động chạy mỗi phút và:
- Tìm bookings sẽ bắt đầu trong 20-21 phút
- Gửi notification cho teacher và student
- Mark `reminder_sent_20min = true` để tránh duplicate

**Không cần gọi thủ công**, service tự động chạy.

---

### 3. Meeting State Tracking

#### Kiểm tra state

```typescript
const meeting = await meetingRepository.findOne({ where: { id } });

console.log(meeting.opened_at); // Thời gian mở
console.log(meeting.closed_at); // Thời gian đóng
console.log(meeting.auto_opened); // Có mở tự động không
console.log(meeting.auto_closed); // Có đóng tự động không
```

---

## 🔧 CONFIGURATION

### Environment Variables

```env
# Redis (cho Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Frontend URL (cho action URLs)
FRONTEND_URL=http://localhost:3001
```

### Queue Configuration

Queue `notifications` đã được đăng ký trong:
- `src/infrastructure/queue/queue.module.ts`
- `src/features/notifications/notifications.module.ts`

---

## 📊 FLOW DIAGRAM

### Notification Flow

```
Cron Job (ReminderService)
    ↓
Tìm bookings sắp bắt đầu (20 phút)
    ↓
NotificationService.send()
    ↓
Tạo Notification record (PENDING)
    ↓
Add job to Bull Queue
    ↓
NotificationProcessor (Worker)
    ↓
Gửi Email/Push/In-App
    ↓
Update Notification status (SENT)
```

### Meeting State Flow

```
Cron Job (MeetingSchedulerService)
    ↓
Tìm meetings cần mở/đóng
    ↓
openMeeting() / closeMeeting()
    ↓
Update Meeting:
  - status: LIVE/ENDED
  - opened_at / closed_at
  - auto_opened / auto_closed
```

---

## 🧪 TESTING

### Test Notification

```bash
# 1. Tạo booking sẽ bắt đầu sau 20 phút
POST /api/v1/bookings
{
  "slot_id": "xxx",
  "student_notes": "Test"
}

# 2. Đợi 1 phút (cron job chạy)
# 3. Check notifications
GET /api/v1/notifications

# 4. Check queue
# Redis: KEYS bull:notifications:*
```

### Test Meeting State

```bash
# 1. Tạo meeting sẽ bắt đầu sau 1 phút
POST /api/v1/meetings
{
  "scheduled_at": "2025-12-03T12:01:00Z"
}

# 2. Đợi 2 phút
# 3. Check meeting state
GET /api/v1/meetings/:id

# Should see:
# - status: "live"
# - opened_at: timestamp
# - auto_opened: true
```

---

## ⚠️ TODO / FUTURE IMPROVEMENTS

### 1. Email Integration
- [ ] Integrate với SendGrid/AWS SES
- [ ] Tạo email templates
- [ ] Test email delivery

### 2. Push Notification
- [ ] Integrate với Firebase Cloud Messaging
- [ ] Store FCM tokens trong User entity
- [ ] Test push notifications

### 3. In-App Notifications
- [ ] WebSocket integration
- [ ] Real-time updates
- [ ] Notification bell component

### 4. Analytics
- [ ] Track notification delivery rate
- [ ] Track read rate
- [ ] Monitor queue performance

---

## 📝 NOTES

1. **Queue System**: Đang dùng `@nestjs/bull` (version cũ). Có thể upgrade lên `@nestjs/bullmq` sau.

2. **Email/Push**: Hiện tại chỉ log, chưa implement thực sự. Cần integrate với email/push service.

3. **Performance**: Queue system giúp tránh block cron job khi gửi email/push.

4. **Idempotency**: `reminder_sent_20min` flag đảm bảo không gửi duplicate reminders.

---

**Version:** 1.0  
**Author:** Development Team  
**Last Updated:** 03/12/2025

