# 📚 TalkConnect Platform - Documentation Index

**Project**: TalkConnect - Online Learning Platform  
**Version**: 1.0  
**Last Updated**: 2025-12-01

---

## 🎯 QUICK START

### Bạn Muốn Làm Gì?

1. **📖 Xem tổng quan hệ thống** → Đọc [QUICK_SUMMARY.md](./QUICK_SUMMARY.md)
2. **🔍 Review Phase 1 & 2** → Đọc [PHASE_1_2_3_REVIEW.md](./PHASE_1_2_3_REVIEW.md)
3. **🚀 Bắt đầu Phase 3** → Đọc [PHASE3_IMPLEMENTATION_PLAN.md](./PHASE3_IMPLEMENTATION_PLAN.md)
4. **✅ Theo dõi tiến độ** → Dùng [PHASE3_CHECKLIST.md](./PHASE3_CHECKLIST.md)
5. **📋 Chi tiết kỹ thuật** → Đọc [docs/PHASE3_PAYMENT_RELEASE.md](./docs/PHASE3_PAYMENT_RELEASE.md)

---

## 📁 DOCUMENT STRUCTURE

### 📊 Overview Documents

| File | Description | When to Read |
|------|-------------|--------------|
| **QUICK_SUMMARY.md** | Tóm tắt nhanh toàn bộ hệ thống | Đầu tiên |
| **PHASE_1_2_3_REVIEW.md** | Review chi tiết Phase 1, 2, 3 | Khi cần hiểu rõ |
| **SYSTEM_AUDIT_REPORT.md** | Báo cáo kiểm tra hệ thống | Khi debug |

### 🚀 Implementation Guides

| File | Description | When to Read |
|------|-------------|--------------|
| **PHASE3_IMPLEMENTATION_PLAN.md** | Kế hoạch 5 ngày Phase 3 | Trước khi code |
| **PHASE3_CHECKLIST.md** | Checklist theo dõi tiến độ | Mỗi ngày |
| **docs/PHASE1_IMPLEMENTATION_GUIDE.md** | Hướng dẫn Phase 1 | Reference |
| **docs/PHASE2_IMPLEMENTATION_GUIDE.md** | Hướng dẫn Phase 2 | Reference |
| **docs/PHASE3_PAYMENT_RELEASE.md** | Chi tiết kỹ thuật Phase 3 | Khi implement |

### 📖 Reference Documents

| File | Description | When to Read |
|------|-------------|--------------|
| **API_ENDPOINTS.md** | Danh sách tất cả API | Khi test API |
| **6_Lộ trình thực hiện.MD** | Roadmap tổng thể | Planning |
| **1_Kiến trúc tổng quan.MD** | Kiến trúc hệ thống | Architecture |
| **2_Đặc tả tính năng.MD** | Đặc tả tính năng | Requirements |

---

## 🗺️ ROADMAP OVERVIEW

```
Phase 0: Setup & Foundation ✅
    ↓
Phase 1: Course Management ✅
    ↓
Phase 2: Enrollment & Payment ✅
    ↓
Phase 2.5: Run Migration ⏳ (BLOCKER)
    ↓
Phase 3: Auto-Release & Withdrawal 🚀 (5 days)
    ↓
Phase 4: Free Talk Rooms 📅 (Future)
    ↓
Phase 5: Content Moderation 📅 (Future)
```

---

## 📋 CURRENT STATUS

### ✅ Completed

- **Phase 1**: Course Management System
  - Courses, Sessions, Lessons, Materials
  - Teacher dashboard
  - QR code generation
  - 20+ API endpoints

- **Phase 2**: Enrollment & Payment System
  - Enrollment & purchase flow
  - Payment hold (escrow)
  - Access control
  - Admin credit management

### ⏳ Pending

- **Phase 2.5**: Database Migration
  - Need to run migration for enrollment tables
  - **BLOCKER** for Phase 3

### 🚀 Ready to Start

- **Phase 3**: Payment Auto-Release
  - Attendance tracking
  - Auto-release payments
  - Commission calculation
  - Withdrawal system
  - Revenue dashboard

---

## 🎯 PHASE 3: QUICK OVERVIEW

### What We're Building

1. **Attendance Tracking** (Day 2)
   - Track student join/leave via LiveKit webhooks
   - Calculate attendance percentage
   - Store in database

2. **Payment Auto-Release** (Day 3)
   - Cron job runs every 5 minutes
   - Release to teacher if attendance >= 20%
   - Refund to student if attendance < 20%
   - Calculate platform commission

3. **Withdrawal System** (Day 4)
   - Teachers request withdrawal
   - Admin approves/rejects
   - Bank transfer integration

4. **Revenue Dashboard** (Day 5)
   - Teacher earnings summary
   - Transaction history
   - Withdrawal history

### Timeline

- **Day 1**: Database schema & entities
- **Day 2**: Attendance tracking service
- **Day 3**: Payment auto-release
- **Day 4**: Withdrawal system
- **Day 5**: Revenue dashboard & frontend

### Key Files to Create

```
Backend:
  - src/features/payments/entities/transaction.entity.ts
  - src/features/payments/entities/withdrawal.entity.ts
  - src/features/courses/entities/attendance-record.entity.ts
  - src/features/payments/payment-release.service.ts
  - src/features/courses/attendance.service.ts
  - src/features/livekit/livekit-webhook.controller.ts

Frontend:
  - src/app/teacher/revenue/page.tsx
  - src/app/teacher/revenue/withdraw/page.tsx
  - src/api/revenue.ts
  - src/api/withdrawals.ts
```

---

## 🔧 TECHNICAL STACK

### Backend
- **Framework**: NestJS
- **Database**: MySQL
- **ORM**: TypeORM
- **Real-time**: LiveKit
- **Caching**: Redis
- **Scheduling**: @nestjs/schedule

### Frontend
- **Framework**: Next.js 14
- **UI**: React + TailwindCSS
- **State**: React Query
- **Forms**: React Hook Form

### Infrastructure
- **Video**: LiveKit Cloud
- **Storage**: Local file system
- **Deployment**: Docker

---

## 📊 BUSINESS LOGIC

### Payment Flow
```
Student Purchase → Deduct Credits → Create PaymentHold
    ↓
Session Happens → Track Attendance
    ↓
Session Ends → Calculate Attendance %
    ↓
Attendance >= 20%?
    ↙         ↘
  YES         NO
    ↓          ↓
Release     Refund
to Teacher  to Student
    ↓
Apply Commission
```

### Commission Rules
- **Referred Teacher**: 30% platform, 70% teacher
- **Direct Teacher**: 0% platform, 100% teacher

### Withdrawal Rules
- Minimum: $10
- Must be verified teacher
- Amount <= available balance
- Status: pending → processing → completed/rejected

---

## 🧪 TESTING

### Before Phase 3
```bash
# 1. Run migration
cd talkplatform-backend
npm run migration:run

# 2. Verify tables
mysql -u root -p -e "SHOW TABLES" talkconnect

# 3. Test enrollment
POST /api/enrollments/courses/:courseId
```

### During Phase 3
```bash
# Test webhooks
curl -X POST http://localhost:3000/api/webhooks/livekit

# Test payment release
# (Cron job runs automatically)

# Test withdrawal
POST /api/withdrawals/request
```

---

## 🐛 TROUBLESHOOTING

### Common Issues

1. **Migration Fails**
   - Check MySQL is running
   - Check `.env` credentials
   - Try manual SQL execution

2. **Foreign Key Errors**
   - Use SQL without FK constraints
   - See SYSTEM_AUDIT_REPORT.md

3. **Webhook Not Working**
   - Check LiveKit configuration
   - Verify webhook signature
   - Check logs

4. **Cron Job Not Running**
   - Check ScheduleModule imported
   - Check @Cron decorator
   - Check logs

---

## 📞 SUPPORT

### Resources

1. **Documentation**: Read files in `/docs`
2. **API Testing**: Use Postman or curl
3. **Logs**: Check console output
4. **Database**: Use MySQL Workbench

### Getting Help

1. Check relevant documentation
2. Review implementation guides
3. Check SYSTEM_AUDIT_REPORT.md
4. Review error logs

---

## ✅ NEXT STEPS

### Immediate (Today)

1. ✅ Read QUICK_SUMMARY.md
2. ✅ Read PHASE_1_2_3_REVIEW.md
3. ⏳ Run migration for Phase 2
4. ✅ Read PHASE3_IMPLEMENTATION_PLAN.md

### This Week (5 Days)

1. 🚀 Day 1: Create entities & migration
2. 🚀 Day 2: Attendance tracking
3. 🚀 Day 3: Payment auto-release
4. 🚀 Day 4: Withdrawal system
5. 🚀 Day 5: Revenue dashboard

### Next Week

1. 📅 Test complete system
2. 📅 Deploy to staging
3. 📅 User acceptance testing
4. 📅 Deploy to production

---

## 📝 DOCUMENT UPDATES

### Version History

- **2025-12-01**: Initial documentation for Phase 3
- **2025-11-27**: Phase 2 implementation complete
- **2025-11-25**: Phase 1 implementation complete

### Contributing

When updating documentation:
1. Update version number
2. Add to version history
3. Update last updated date
4. Keep documents in sync

---

## 🎓 LEARNING RESOURCES

### For Developers

1. **NestJS**: https://docs.nestjs.com
2. **TypeORM**: https://typeorm.io
3. **LiveKit**: https://docs.livekit.io
4. **Next.js**: https://nextjs.org/docs

### For Business

1. **6_Lộ trình thực hiện.MD**: Overall roadmap
2. **2_Đặc tả tính năng.MD**: Feature specifications
3. **QUICK_SUMMARY.md**: System overview

---

**Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 🚀 Ready  
**Blocker**: Migration needs to run before Phase 3  
**Timeline**: 5 days for complete Phase 3 implementation

---

**Happy Coding! 🚀**
