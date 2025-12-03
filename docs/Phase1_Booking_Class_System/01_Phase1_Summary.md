# PHASE 1: BOOKING & CLASS SYSTEM - TỔNG QUAN

**Ngày tạo:** 03/12/2025  
**Thời gian thực hiện:** 2 tuần (Week 1-2)  
**Độ ưu tiên:** 🔴 CRITICAL

---

## 🎯 MỤC TIÊU PHASE 1

Hoàn thiện hệ thống đặt lịch và quản lý lớp học tự động, bao gồm:

1. ✅ Auto mở/đóng phòng theo thời gian đã set
2. ✅ Hệ thống thông báo trước 20 phút
3. ✅ Logic refund tự động khi hủy lịch
4. ✅ Calendar UI chuyên nghiệp
5. ✅ Check-in quyền vào phòng

---

## 📊 HIỆN TRẠNG

### ✅ Đã có (70%)
- Database schema hoàn chỉnh (Schedule, Booking, BookingSlot)
- API CRUD cơ bản cho booking
- Wallet service với double-entry ledger
- Frontend pages cơ bản

### ❌ Còn thiếu (30%)
- Auto mở/đóng phòng theo schedule
- Notification system (20 phút trước)
- Refund logic tự động
- Calendar UI chuyên nghiệp
- Check-in middleware hoàn chỉnh

---

## 🗓️ TIMELINE

### **Week 1: Auto Schedule & Notification**
- **Day 1-2:** Auto mở/đóng phòng
- **Day 3-4:** Notification system
- **Day 5:** Testing & bug fixes

### **Week 2: Refund & Calendar UI**
- **Day 1-2:** Refund logic
- **Day 3-4:** Calendar UI
- **Day 5:** Integration & testing

---

## 📋 DELIVERABLES

### Backend
1. ✅ Cron job auto mở/đóng phòng
2. ✅ Notification service (email + in-app)
3. ✅ Refund service với transaction
4. ✅ Check-in middleware

### Frontend
1. ✅ Calendar component (react-big-calendar)
2. ✅ Time slot picker
3. ✅ Notification UI
4. ✅ Booking confirmation flow

### Database
1. ✅ Migration: Add notification fields
2. ✅ Migration: Add room_state tracking

---

## 🎯 SUCCESS CRITERIA

### Functional
- [ ] Phòng tự động mở đúng giờ đã set
- [ ] Phòng tự động đóng sau khi hết giờ
- [ ] Teacher & students nhận thông báo trước 20 phút
- [ ] Refund tự động khi teacher hủy lịch
- [ ] Calendar UI dễ sử dụng, chọn slot nhanh

### Non-Functional
- [ ] Response time < 200ms cho API
- [ ] Notification gửi trong vòng 1 phút
- [ ] 100% refund transactions thành công
- [ ] UI responsive trên mobile

---

## 📁 CẤU TRÚC TÀI LIỆU PHASE 1

```
Phase1_Booking_Class_System/
├── 01_Phase1_Summary.md                    (File này)
├── 02_Auto_Schedule_Implementation.md      (Auto mở/đóng phòng)
├── 03_Notification_System.md               (Hệ thống thông báo)
├── 04_Refund_Logic.md                      (Logic hoàn tiền)
├── 05_Calendar_UI.md                       (Giao diện lịch)
├── 06_Check_In_Middleware.md               (Kiểm tra quyền vào)
├── 07_Testing_Guide.md                     (Hướng dẫn test)
└── 08_Deployment_Checklist.md              (Checklist deploy)
```

---

## 🔗 DEPENDENCIES

### External Libraries
- `node-cron` - Cron job scheduler
- `@nestjs/schedule` - NestJS scheduler
- `react-big-calendar` - Calendar UI
- `date-fns` - Date utilities

### Internal Services
- WalletService (refund)
- MeetingService (room state)
- NotificationService (alerts)

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Cron job không chạy đúng giờ
**Mitigation:** 
- Sử dụng @nestjs/schedule với timezone config
- Add logging để track execution
- Fallback: Manual trigger API

### Risk 2: Notification bị delay
**Mitigation:**
- Queue system (Bull/Redis)
- Retry mechanism
- Monitoring alerts

### Risk 3: Refund transaction fail
**Mitigation:**
- Database transaction với rollback
- Idempotency key
- Manual refund tool cho admin

---

## 📞 NEXT STEPS

1. Đọc `02_Auto_Schedule_Implementation.md` để bắt đầu
2. Setup cron job environment
3. Implement từng feature theo thứ tự
4. Test kỹ trước khi deploy

---

**Version:** 1.0  
**Author:** Development Team  
**Last Updated:** 03/12/2025
