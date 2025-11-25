# 4Talk Platform - Quick Reference Guide

## 🎯 Tổng quan hệ thống

### 2 Loại phòng chính:

#### 1. **Paid Courses** (Khóa học trả phí)
- Giáo viên tạo khóa học với nhiều buổi học
- Học viên có thể mua:
  - **Theo buổi**: Mua từng buổi riêng lẻ
  - **Cả khóa**: Mua toàn bộ khóa học
- Giá tối thiểu: **$1.00**
- Payment hold: Giữ tiền đến khi buổi học kết thúc
- Auto-release: Tự động thanh toán dựa trên attendance (>= 20%)

#### 2. **Free Talk Rooms** (Phòng miễn phí)
- Tối đa **4 người**
- Tìm theo khu vực (GeoIP)
- Auto-close khi không còn ai

---

## 📊 Database Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `courses` | Khóa học | teacher_id, title, price_type, price_per_session, price_full_course |
| `course_sessions` | Buổi học trong khóa | course_id, session_number, scheduled_date, duration_minutes |
| `course_enrollments` | Đăng ký khóa học | user_id, course_id, enrollment_type, total_price_paid |
| `session_purchases` | Mua buổi học riêng | user_id, session_id, price_paid, attended, attendance_duration_minutes |
| `payment_holds` | Giữ tiền | enrollment_id/session_purchase_id, amount, status, release_percentage |
| `free_talk_rooms` | Phòng Free Talk | host_id, max_participants (4), region, status |
| `transactions` | Giao dịch tài chính | user_id, type, amount, status |
| `withdrawals` | Rút tiền (teacher) | teacher_id, amount, status |
| `reviews` | Đánh giá giáo viên | teacher_id, student_id, rating (1-5) |

---

## 🔄 Payment Flow

### Purchase Flow (Mua khóa/buổi học)
```
Student → Check Credit → Deduct Credit → Create Purchase → Hold Payment → Notify Teacher
```

### Auto-Release Flow (Sau buổi học)
```
Session Ends → Calculate Attendance → 
  If >= 20%: Release to Teacher (70% or 30% commission)
  If < 20%: Refund to Student
```

### Withdrawal Flow (Giáo viên rút tiền)
```
Teacher Request → Check Available Balance → Create Withdrawal → 
Admin Approve → Transfer Money → Update Balance
```

---

## 💰 Commission Structure

| Student Source | Teacher Share | Platform Share |
|----------------|---------------|----------------|
| Referred by Teacher | **70%** | 30% |
| Platform Source | **30%** | 70% |

---

## 🎓 Teacher Features

### Tạo Khóa học
```typescript
POST /api/courses
{
  "title": "English Conversation",
  "description": "...",
  "total_sessions": 10,
  "duration_hours": 20,
  "price_type": "per_session", // or "full_course"
  "price_per_session": 10.00,
  "price_full_course": 80.00,
  "language": "English",
  "level": "beginner"
}
```

### Thêm Buổi học
```typescript
POST /api/courses/:id/sessions
{
  "session_number": 1,
  "title": "Introduction",
  "scheduled_date": "2025-12-01",
  "start_time": "10:00",
  "end_time": "11:30",
  "duration_minutes": 90
}
```

### Dashboard Endpoints
```typescript
GET /api/teachers/me/courses?status=upcoming    // Khóa sắp diễn ra
GET /api/teachers/me/courses?status=ongoing     // Khóa đang diễn ra
GET /api/teachers/me/courses?status=completed   // Khóa đã kết thúc

GET /api/teachers/me/revenue/total              // Tổng doanh thu
GET /api/teachers/me/revenue/by-course/:id      // Doanh thu theo khóa
GET /api/teachers/me/revenue/refunds            // Tiền refund

GET /api/teachers/me/withdrawals                // Lịch sử rút tiền
POST /api/teachers/me/withdrawals               // Yêu cầu rút tiền
```

---

## 🎓 Student Features

### Mua Buổi học
```typescript
POST /api/courses/:courseId/sessions/:sessionId/purchase
// Response: Purchase created, payment held
```

### Mua Cả khóa
```typescript
POST /api/courses/:courseId/enroll
// Response: Enrollment created, payment held
```

### Hủy
```typescript
POST /api/courses/:courseId/sessions/:sessionId/cancel  // Hủy buổi
POST /api/courses/:courseId/cancel                      // Hủy khóa
```

### Dashboard
```typescript
GET /api/students/me/enrollments                // Khóa đã đăng ký
GET /api/students/me/sessions                   // Buổi đã mua
GET /api/students/me/transactions               // Lịch sử giao dịch
```

---

## 🎯 Free Talk Features

### Tạo Phòng
```typescript
POST /api/free-talk/rooms
{
  "room_name": "English Practice",
  "description": "Let's practice!",
  "language": "English",
  "level": "beginner"
}
// Auto-generate: QR code, share link
// Max participants: 4
```

### Tìm Phòng
```typescript
GET /api/free-talk/rooms?region=VN              // Filter by region
GET /api/free-talk/nearby                       // Tìm phòng gần (GeoIP)
```

### Join/Leave
```typescript
POST /api/free-talk/rooms/:id/join              // Join phòng
POST /api/free-talk/rooms/:id/leave             // Leave phòng
// Auto-close when last user leaves
```

---

## 🔔 Notifications

### Teacher Notifications
- ✅ New session purchase
- ✅ New course enrollment
- ✅ Session cancelled
- ✅ Payment released
- ✅ Withdrawal approved

### Student Notifications
- ✅ Session reminder (1 hour before)
- ✅ Session started
- ✅ Refund processed
- ✅ Course updated

---

## 🧪 Testing Checklist

### Course Management
- [ ] Create course with sessions
- [ ] Generate QR code and share link
- [ ] Update course details
- [ ] Delete course (only if no enrollments)

### Purchase Flow
- [ ] Buy single session
- [ ] Buy full course
- [ ] Check credit validation
- [ ] Payment hold created
- [ ] Teacher notified

### Attendance & Auto-Release
- [ ] Join LiveKit session
- [ ] Track attendance time
- [ ] Leave session
- [ ] Auto-release if >= 20%
- [ ] Auto-refund if < 20%

### Free Talk
- [ ] Create room (max 4)
- [ ] Join via QR/link
- [ ] Chat in room
- [ ] Leave room
- [ ] Auto-close when empty

### Revenue & Withdrawal
- [ ] View revenue dashboard
- [ ] Request withdrawal
- [ ] Admin approve withdrawal
- [ ] Balance updated

---

## 🚀 Quick Start Commands

### Backend
```bash
# Run migrations
cd talkplatform-backend
npm run migration:run

# Start dev server
npm run start:dev

# Generate migration
npm run migration:generate -- -n CreateCourseTables
```

### Frontend
```bash
cd talkplatform-frontend
npm run dev
```

---

## 📁 File Structure

```
Backend:
src/features/
├── courses/              # Course management
├── enrollments/          # Student enrollments
├── sessions/             # Course sessions
├── payments/             # Payment & holds
├── withdrawals/          # Teacher withdrawals
├── free-talk/            # Free talk rooms
└── revenue/              # Revenue tracking

Frontend:
app/
├── courses/              # Browse & create courses
├── my-courses/           # Student enrollments
├── revenue/              # Teacher revenue
├── withdrawals/          # Teacher withdrawals
└── free-talk/            # Free talk rooms
```

---

## 🔒 Security Notes

1. **Transaction Safety**: Always use database transactions
2. **Payment Validation**: Check credit before purchase
3. **Attendance Verification**: Use LiveKit webhooks
4. **Authorization**: Check teacher/student roles
5. **Rate Limiting**: Prevent abuse

---

## 📞 Next Steps

1. **Review** `IMPLEMENTATION_PLAN.md` for detailed specs
2. **Choose** which phase to start (recommend: Course Management)
3. **Request** help for specific features

Example requests:
- "Implement Course Service with all CRUD operations"
- "Create Purchase Flow with payment hold"
- "Build Teacher Revenue Dashboard"
- "Implement Free Talk Room system"

---

**Ready to build? Let me know which feature to start with!** 🚀
