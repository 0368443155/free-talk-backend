# PHASE 1 - IMMEDIATE ACTION PLAN

**Ngày:** 05/12/2025  
**Trạng thái:** 🚨 URGENT - CẦN THỰC HIỆN NGAY  

---

## 🎯 TÓM TẮT NHANH

**Tỷ lệ hoàn thành:** ~85%  
**Vấn đề nghiêm trọng nhất:** ❌ Thiếu entities trong `data-source.ts`  
**Thời gian cần:** ~2 ngày làm việc  

---

## 🔴 CRITICAL - LÀM NGAY HÔM NAY

### 1. Fix data-source.ts (30 phút) 🔴

**Vấn đề:**
- File `data-source.ts` thiếu **20+ entities quan trọng**
- Đặc biệt: Booking, BookingSlot, Schedule, Notification
- **HỆ THỐNG KHÔNG THỂ HOẠT ĐỘNG ĐÚNG!**

**Hành động:**
```bash
cd talkplatform-backend

# Backup
cp data-source.ts data-source.ts.backup

# Edit file theo hướng dẫn trong:
# docs/Phase1_Booking_Class_System/23_FIX_DATA_SOURCE_ENTITIES.md
```

**Entities cần thêm:**
- ✅ Booking, BookingSlot
- ✅ Schedule
- ✅ Notification
- ✅ LedgerEntry, LedgerTransaction
- ✅ CreditPackage, CreditTransaction
- ✅ Recording, AnalyticsEvent, EngagementMetric
- ✅ WebhookEvent, LiveKitEventDetail
- ✅ Material, MaterialCategory, MaterialPurchase, MaterialReview
- ✅ GlobalChatMessage
- ✅ TeacherVerification entities (4 entities)

---

### 2. Run Migrations (30 phút) 🔴

**Sau khi fix data-source.ts:**

```bash
cd talkplatform-backend

# Check migration status
npm run migration:show

# Run migrations
npm run migration:run

# Verify
npm run migration:show
```

**Expected:**
- All Phase 1 migrations run successfully
- No errors

---

### 3. Test Backend (30 phút) 🔴

```bash
cd talkplatform-backend

# Start backend
npm run start:dev

# Check logs for:
# ✅ No entity errors
# ✅ "Checking for meetings to open..." (cron job)
# ✅ "Checking for reminders..." (cron job)
# ✅ Backend starts successfully
```

---

## 🟡 HIGH - LÀM TRONG TUẦN NÀY

### 4. Apply MeetingAccessGuard (1 giờ) 🟡

**Vấn đề:**
- Guard đã tạo nhưng chưa apply vào controllers

**Files cần sửa:**
- `src/features/meeting/public-meetings.controller.ts`
- `src/features/meeting/meetings-general.controller.ts`
- `src/features/meeting/classrooms.controller.ts`

**Thêm:**
```typescript
import { MeetingAccessGuard } from './guards/meeting-access.guard';

@UseGuards(JwtAuthGuard, MeetingAccessGuard)
@Get(':id/join')
async joinMeeting(@Param('id') id: string, @Req() req) {
  // ...
}
```

---

### 5. Verify Service Integration (1 giờ) 🟡

**Vấn đề:**
- Có 2 auto schedule services: `MeetingSchedulerService` và `ScheduleAutomationService`

**Hành động:**
1. Check `meetings.module.ts` - cả 2 đều được register
2. Check logs - service nào đang chạy?
3. Xóa service không dùng (nếu có)

---

### 6. Test Notification System (2 giờ) 🟡

**Test flow:**
```bash
# 1. Create booking 20 phút trong tương lai
POST /api/v1/bookings

# 2. Wait 1 phút (cron job chạy)

# 3. Check notifications
GET /api/v1/notifications

# 4. Verify notification sent
```

---

### 7. Test Auto Schedule (2 giờ) 🟡

**Test flow:**
```bash
# 1. Create lesson/booking với start_time trong 5 phút

# 2. Wait và check logs

# 3. Verify meeting opened automatically

# 4. Wait đến end_time + 5 phút

# 5. Verify meeting closed automatically
```

---

### 8. Test Refund Logic (2 giờ) 🟡

**Test scenarios:**
1. Teacher cancel → 100% refund
2. Student cancel >24h → 100% refund
3. Student cancel <24h → 50% refund

---

## 🟢 MEDIUM - LÀM TUẦN SAU

### 9. Verify Frontend Integration (2 giờ) 🟢

**Check:**
- [ ] NotificationBell trong main nav
- [ ] Notifications page hoạt động
- [ ] Calendar pages hoạt động
- [ ] API integration

---

### 10. Integration Testing (4 giờ) 🟢

**Full flow testing:**
1. Booking → Notification → Auto open → Auto close → Refund
2. Edge cases
3. Error handling

---

### 11. Code Cleanup (2 giờ) 🟢

- Remove duplicate services
- Clean unused imports
- Add error handling
- Code review

---

### 12. Documentation (2 giờ) 🟢

- Update final summary
- Create deployment guide
- Update API docs

---

## 📋 QUICK CHECKLIST

### Hôm nay (CRITICAL)
- [ ] ✅ Fix data-source.ts
- [ ] ✅ Run migrations
- [ ] ✅ Test backend startup
- [ ] ✅ Verify no errors

### Tuần này (HIGH)
- [ ] Apply MeetingAccessGuard
- [ ] Verify service integration
- [ ] Test notification system
- [ ] Test auto schedule
- [ ] Test refund logic

### Tuần sau (MEDIUM)
- [ ] Verify frontend
- [ ] Integration testing
- [ ] Code cleanup
- [ ] Documentation
- [ ] Deploy to staging

---

## 🎯 SUCCESS CRITERIA

**Phase 1 = 100% complete khi:**

1. ✅ All entities trong data-source.ts
2. ✅ All migrations run successfully
3. ✅ Backend starts without errors
4. ✅ All cron jobs running
5. ✅ All guards applied
6. ✅ All tests passing
7. ✅ Frontend integrated
8. ✅ Documentation complete

---

## 📊 TIME ESTIMATES

| Task | Time | Priority |
|------|------|----------|
| Fix data-source.ts | 30 min | 🔴 CRITICAL |
| Run migrations | 30 min | 🔴 CRITICAL |
| Test backend | 30 min | 🔴 CRITICAL |
| Apply guards | 1 hour | 🟡 HIGH |
| Verify services | 1 hour | 🟡 HIGH |
| Test notification | 2 hours | 🟡 HIGH |
| Test auto schedule | 2 hours | 🟡 HIGH |
| Test refund | 2 hours | 🟡 HIGH |
| Frontend verify | 2 hours | 🟢 MEDIUM |
| Integration test | 4 hours | 🟢 MEDIUM |
| Code cleanup | 2 hours | 🟢 MEDIUM |
| Documentation | 2 hours | 🟢 MEDIUM |
| **TOTAL** | **~19 hours** | **~2.5 days** |

---

## 🚨 CRITICAL PATH

```
Day 1 Morning:
├─ Fix data-source.ts (30 min)
├─ Run migrations (30 min)
└─ Test backend (30 min)

Day 1 Afternoon:
├─ Apply guards (1 hour)
└─ Verify services (1 hour)

Day 2:
├─ Test notification (2 hours)
├─ Test auto schedule (2 hours)
└─ Test refund (2 hours)

Day 3:
├─ Frontend verify (2 hours)
├─ Integration test (4 hours)
└─ Code cleanup (2 hours)

Day 4:
├─ Documentation (2 hours)
└─ Deploy to staging
```

---

## 📞 NEXT STEPS

**Immediate (Ngay bây giờ):**
1. Đọc `23_FIX_DATA_SOURCE_ENTITIES.md`
2. Fix data-source.ts
3. Run migrations
4. Test backend

**Today:**
- Complete critical tasks
- Verify system working

**This Week:**
- Complete high priority tasks
- Start testing

**Next Week:**
- Complete medium priority tasks
- Deploy to staging

---

## 🔗 RELATED DOCS

- `22_FINAL_SYSTEM_AUDIT_REPORT.md` - Báo cáo chi tiết
- `23_FIX_DATA_SOURCE_ENTITIES.md` - Hướng dẫn fix entities
- `16_Completion_Action_Plan.md` - Action plan cũ
- `15_System_Verification_Report.md` - Verification report

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Status:** 🚨 URGENT - Execute immediately  
**Next Review:** After fixing critical issues
