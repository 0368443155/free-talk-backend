# TESTING GUIDE - PHASE 1

**Ngày tạo:** 03/12/2025  
**File:** 07_Testing_Guide.md  
**Phạm vi:** Booking, Auto Schedule, Notification, Refund

---

## 🧪 1. UNIT TESTING (Jest)

### Auto Schedule Service
```typescript
describe('ScheduleAutomationService', () => {
  it('should NOT distribute revenue if teacher did not join', async () => {
    // Mock verifyTeacherAttendance -> false
    jest.spyOn(service, 'verifyTeacherAttendance').mockResolvedValue(false);
    
    await service.closeMeeting(mockMeeting);
    
    expect(revenueService.distributeRevenue).not.toHaveBeenCalled();
    expect(notificationService.sendToAdmins).toHaveBeenCalled();
  });

  it('should distribute revenue if teacher joined', async () => {
    // Mock verifyTeacherAttendance -> true
    jest.spyOn(service, 'verifyTeacherAttendance').mockResolvedValue(true);
    
    await service.closeMeeting(mockMeeting);
    
    expect(revenueService.distributeRevenue).toHaveBeenCalled();
  });
});
```

### Refund Logic
```typescript
describe('RefundService', () => {
  it('should calculate 100% refund for >24h cancellation (UTC)', () => {
    const scheduledAt = new Date('2025-12-05T10:00:00Z');
    const now = new Date('2025-12-04T09:00:00Z'); // 25h before
    // Assert refund = 100%
  });

  it('should calculate 50% refund for <24h cancellation (UTC)', () => {
    const scheduledAt = new Date('2025-12-05T10:00:00Z');
    const now = new Date('2025-12-04T11:00:00Z'); // 23h before
    // Assert refund = 50%
  });
});
```

---

## 🔄 2. INTEGRATION TESTING

### Notification Queue
1. **Trigger:** Gọi API tạo notification.
2. **Check Redis:** Verify job được thêm vào queue `notifications`.
3. **Check Worker:** Verify worker process job và gọi Mock MailService.

### Timezone Flow
1. **Setup:** Set DB timezone UTC.
2. **Action:** Teacher (US) tạo slot 8:00 AM (UTC-5).
3. **Verify DB:** Slot lưu là 13:00 PM (UTC).
4. **View:** Student (VN) xem lịch -> Thấy 20:00 PM (UTC+7).

---

## 📝 3. MANUAL TEST CASES

| ID | Feature | Scenario | Steps | Expected Result |
|----|---------|----------|-------|-----------------|
| TC01 | Auto Open | Đúng giờ | 1. Tạo meeting start sau 2p<br>2. Chờ 2p | Meeting state -> OPEN<br>Notification sent |
| TC02 | Auto Close | Teacher vắng | 1. Tạo meeting end sau 2p<br>2. Teacher KHÔNG join<br>3. Chờ 2p | Meeting state -> CLOSED<br>Revenue NOT distributed<br>Admin alert sent |
| TC03 | Refund | Hủy sớm | 1. Book lớp ngày kia<br>2. Hủy ngay | Refund 100% credits |
| TC04 | Refund | Hủy muộn | 1. Book lớp tối nay<br>2. Hủy ngay | Refund 50% credits |
| TC05 | Security | Join sớm | 1. Book lớp ngày mai<br>2. Cố tình join API | 403 Forbidden |

---

## 🛠️ 4. LOAD TESTING (Optional)

Sử dụng **k6** để test Cron Job performance:
- Tạo 10,000 dummy meetings trong DB.
- Chạy cron job.
- Monitor execution time (Target < 5s).

---

**Next:** `08_Deployment_Checklist.md`
