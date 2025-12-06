# Booking vs Marketplace - So Sánh Chi Tiết

**Ngày:** 2025-01-03  
**Mục đích:** Giải thích sự khác biệt và mối quan hệ giữa Booking System và Marketplace

---

## 🎯 TÓM TẮT NHANH

| Tiêu Chí | Booking System | Marketplace |
|----------|----------------|-------------|
| **Mục đích** | Đặt lịch lớp học **REAL-TIME** | Mua tài liệu/course **OFFLINE** |
| **Loại sản phẩm** | Live sessions (1-1 với teacher) | Materials (PDF, documents, courses) |
| **Cách sử dụng** | Join phòng LiveKit để học | Download materials để học |
| **Thanh toán** | Trả khi book slot | Trả khi purchase material |
| **Thời gian** | Có lịch cụ thể (scheduled_at) | Không có lịch, học bất cứ lúc nào |
| **Meeting** | ✅ Tạo Meeting entity | ❌ Không tạo Meeting |

---

## 📚 BOOKING SYSTEM - Chi Tiết

### Mục Đích

**Đặt lịch lớp học 1-1 với giáo viên để học REAL-TIME qua video call**

### Luồng Hoạt Động

```
1. Teacher tạo BookingSlot (time slot)
   └─> Example: 2025-01-05 10:00-11:00, 100 credits

2. Student xem calendar và chọn slot
   └─> Booking page hiển thị available slots

3. Student book slot
   └─> Tạo Booking entity
   └─> Tạo Meeting entity (để join video)
   └─> Trừ credits ngay lập tức

4. Đến giờ học
   └─> Auto mở phòng (cron job)
   └─> Student & Teacher join LiveKit room
   └─> Học real-time qua video

5. Kết thúc lớp
   └─> Auto đóng phòng
   └─> Chia revenue (affiliate system)
   └─> Refund nếu hủy trước giờ
```

### Entities Chính

```typescript
// 1. BookingSlot - Slot thời gian có thể đặt
{
  teacher_id: string,
  date: Date,           // 2025-01-05
  start_time: string,   // 10:00:00
  end_time: string,     // 11:00:00
  price_credits: 100,
  is_booked: false
}

// 2. Booking - Đặt chỗ của student
{
  student_id: string,
  teacher_id: string,
  meeting_id: string,   // Link đến Meeting
  scheduled_at: Date,   // 2025-01-05 10:00:00
  credits_paid: 100,
  status: 'confirmed'
}

// 3. Meeting - Phòng video call
{
  title: "Class with Teacher A",
  host_id: string,      // Teacher
  scheduled_at: Date,   // 2025-01-05 10:00:00
  status: 'scheduled',
  meeting_type: 'PRIVATE_SESSION',
  price_credits: 100
}
```

### Đặc Điểm

✅ **Real-time interaction** - Học trực tiếp với teacher  
✅ **Scheduled** - Có lịch cụ thể  
✅ **Live video** - Sử dụng LiveKit  
✅ **Refund policy** - Hoàn tiền nếu hủy  
✅ **Auto open/close** - Phòng tự động mở/đóng  
✅ **Notifications** - Nhắc nhở 20 phút trước  

### Use Cases

- Học tiếng Anh 1-1 với giáo viên
- Luyện nói (conversation practice)
- Review bài tập
- Hỏi đáp trực tiếp

---

## 🛒 MARKETPLACE - Chi Tiết

### Mục Đích

**Mua tài liệu học tập (PDF, documents) hoặc Course để học OFFLINE**

### Luồng Hoạt Động

```
1. Teacher upload Material/Course
   └─> Example: "IELTS Writing Guide.pdf", 50 credits

2. Material được publish lên Marketplace
   └─> Hiển thị trên /marketplace page

3. Student browse và mua Material
   └─> Trừ credits ngay lập tức
   └─> Tạo MaterialPurchase record

4. Student download và học OFFLINE
   └─> Download file PDF
   └─> Học bất cứ lúc nào
   └─> Không cần lịch cụ thể
```

### Entities Chính

```typescript
// 1. Material - Tài liệu học tập
{
  title: "IELTS Writing Guide",
  teacher_id: string,
  file_url: "/uploads/materials/ielts-guide.pdf",
  price_credits: 50,
  is_published: true,
  download_count: 0
}

// 2. MaterialPurchase - Mua tài liệu
{
  user_id: string,
  material_id: string,
  price_paid: 50,
  transaction_id: string,
  purchased_at: Date,
  download_count: 0
}

// 3. Course (Optional) - Khóa học
{
  title: "Complete IELTS Course",
  teacher_id: string,
  price_credits: 500,
  sessions: [
    { title: "Session 1", content: "..." },
    { title: "Session 2", content: "..." }
  ]
}
```

### Đặc Điểm

✅ **Offline learning** - Học khi nào cũng được  
✅ **Download & own** - Download về máy  
✅ **No schedule** - Không cần lịch  
✅ **One-time purchase** - Mua một lần, dùng mãi  
✅ **Revenue sharing** - Chia doanh thu với teacher (80/20)  
❌ **No real-time** - Không có video call  

### Use Cases

- Tài liệu PDF (IELTS guides, grammar books)
- Video lessons (recorded)
- Worksheets và exercises
- Course với nhiều lessons

---

## 🔄 SỰ KHÁC BIỆT CHÍNH

### 1. Thời Gian

| Booking | Marketplace |
|---------|-------------|
| ⏰ **Scheduled** - Phải đến đúng giờ | ⏰ **Anytime** - Học bất cứ lúc nào |
| Ví dụ: 10:00 AM hôm nay | Ví dụ: Học đêm khuya, cuối tuần |

### 2. Tương Tác

| Booking | Marketplace |
|---------|-------------|
| 🎥 **Real-time** - Video call với teacher | 📄 **Offline** - Download và tự học |
| Có thể hỏi đáp trực tiếp | Không có tương tác trực tiếp |

### 3. Thanh Toán Timing

| Booking | Marketplace |
|---------|-------------|
| 💳 **Pay when book** - Trả trước khi học | 💳 **Pay when purchase** - Trả khi mua |
| Có thể refund nếu hủy | Thường không refund (đã download) |

### 4. Sản Phẩm

| Booking | Marketplace |
|---------|-------------|
| 🎓 **Service** - Dịch vụ học 1-1 | 📚 **Product** - Sản phẩm tài liệu |
| Không sở hữu được | Sở hữu file/material |

### 5. Revenue Sharing

| Booking | Marketplace |
|---------|-------------|
| 💰 **10-30% platform** (tùy affiliate) | 💰 **20% platform** |
| 70-90% teacher (tùy affiliate) | 80% teacher |

---

## 🔗 MỐI QUAN HỆ - Có Thể Kết Hợp?

### Scenario 1: Học Kết Hợp

```
1. Student mua Material từ Marketplace
   └─> "IELTS Speaking Guide.pdf" (50 credits)

2. Student tự học từ Material (offline)

3. Student book 1-1 session với Teacher (Booking)
   └─> Practice những gì đã học
   └─> Hỏi đáp về Material

4. Quay lại học Material và repeat
```

**→ Marketplace cung cấp tài liệu, Booking cung cấp practice**

### Scenario 2: Course + Live Sessions

```
1. Teacher tạo Course trên Marketplace
   └─> 10 lessons về IELTS Writing

2. Student mua Course (500 credits)

3. Student học từng lesson (offline)

4. Student book sessions để review (Booking)
   └─> Hỏi đáp về lessons đã học
```

**→ Marketplace = Content, Booking = Support**

---

## 💡 VÍ DỤ CỤ THỂ

### Booking Example

```
Student A muốn luyện nói tiếng Anh:

1. Vào /bookings page
2. Chọn Teacher B
3. Xem calendar, chọn slot: "Tomorrow 10:00 AM"
4. Book slot (trả 100 credits)
5. Nhận notification 20 phút trước
6. Đến 10:00 AM → Join LiveKit room
7. Học 1 giờ với Teacher B (video call)
8. Kết thúc → Phòng tự đóng
```

### Marketplace Example

```
Student A muốn học IELTS Writing:

1. Vào /marketplace page
2. Tìm "IELTS Writing Guide"
3. Xem preview (3 trang đầu PDF)
4. Mua (trả 50 credits)
5. Download file PDF
6. Học bất cứ lúc nào (offline)
7. Download nhiều lần (nếu cần)
```

---

## 📊 COMPARISON TABLE

| Feature | Booking | Marketplace |
|---------|---------|-------------|
| **Type** | Service (Live Session) | Product (Material/Course) |
| **Interaction** | Real-time video call | Offline download |
| **Schedule** | ✅ Required | ❌ Not required |
| **Meeting** | ✅ Creates Meeting | ❌ No Meeting |
| **LiveKit** | ✅ Uses LiveKit | ❌ No LiveKit |
| **Refund** | ✅ Yes (if cancel) | ❌ Usually no |
| **Ownership** | ❌ No (service) | ✅ Yes (file) |
| **Reusability** | ❌ One-time use | ✅ Download many times |
| **Auto open/close** | ✅ Yes (cron job) | ❌ N/A |
| **Notifications** | ✅ Yes (reminders) | ❌ No |
| **Revenue Platform** | 10-30% | 20% |
| **Revenue Teacher** | 70-90% | 80% |

---

## 🎯 KẾT LUẬN

### Booking System
- **Dùng khi:** Cần học trực tiếp với teacher, có lịch cụ thể
- **Mục đích:** Real-time practice, hỏi đáp trực tiếp
- **Loại:** Service (dịch vụ)

### Marketplace
- **Dùng khi:** Muốn học tự do, không cần lịch
- **Mục đích:** Tự học từ tài liệu, học bất cứ lúc nào
- **Loại:** Product (sản phẩm)

### Mối Quan Hệ

**Chúng BỔ SUNG cho nhau, không thay thế:**

- **Marketplace** = Cung cấp **content** (tài liệu, courses)
- **Booking** = Cung cấp **support** (practice, hỏi đáp)

**Ideal Flow:**
```
Marketplace (Learn content) 
    ↓
Booking (Practice & Get feedback)
    ↓
Marketplace (Learn more content)
    ↓
Repeat...
```

---

## 🔧 TECHNICAL DIFFERENCES

### Database Tables

**Booking:**
- `booking_slots` - Time slots
- `bookings` - Booking records
- `meetings` - Video call rooms
- `meeting_participants` - Who joined

**Marketplace:**
- `materials` - Material files
- `material_purchases` - Purchase records
- `courses` - Course content (optional)
- `course_sessions` - Course lessons (optional)

### Services

**Booking:**
- `BookingService` - Create bookings
- `MeetingSchedulerService` - Auto open/close
- `RefundService` - Handle refunds
- `NotificationService` - Send reminders

**Marketplace:**
- `MaterialService` - Upload/download materials
- `PurchaseService` - Handle purchases
- `RevenueService` - Calculate revenue (80/20)

---

## ✅ RECOMMENDATIONS

### Nên Tách Riêng Vì:

1. **Different use cases** - Khác mục đích sử dụng
2. **Different payment flow** - Khác luồng thanh toán
3. **Different entities** - Khác database structure
4. **Different revenue models** - Khác cách chia revenue

### Có Thể Kết Hợp:

1. **Recommendations** - Suggest materials khi book session
2. **Bundles** - Package: Course + 3 sessions
3. **Upsell** - Sau khi book, suggest related materials

---

**Tóm lại: Booking = Real-time service, Marketplace = Offline products. Chúng bổ sung cho nhau!** 🎯


