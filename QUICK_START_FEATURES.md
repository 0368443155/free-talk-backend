# 4Talk - Quick Start Guide for Remaining Features

## 📋 Tổng quan

Tài liệu này hướng dẫn bạn bắt đầu triển khai các tính năng còn lại theo thứ tự ưu tiên.

---

## 🎯 Ưu tiên triển khai

### ✅ Đã hoàn thành
- [x] User Authentication (Login/Register)
- [x] LiveKit Integration (Video/Audio)
- [x] Global Chat (Real-time messaging)
- [x] Marketplace (Upload/Download materials) - Cơ bản

### 🔥 Priority HIGH - Nên làm ngay

#### 1. Teacher Schedule Management (Tuần 1-2)
**Files đã tạo**:
- ✅ Migration: `1764065000000-CreateSchedulesTable.ts`
- ✅ Entity: `schedule.entity.ts`
- ✅ DTOs: `schedule.dto.ts`

**Cần làm tiếp**:
```bash
# 1. Tạo Service
touch talkplatform-backend/src/features/schedules/schedules.service.ts

# 2. Tạo Controller  
touch talkplatform-backend/src/features/schedules/schedules.controller.ts

# 3. Tạo Module
touch talkplatform-backend/src/features/schedules/schedules.module.ts

# 4. Run migration
cd talkplatform-backend
npm run migration:run

# 5. Frontend components
mkdir -p talkplatform-frontend/components/schedules
touch talkplatform-frontend/components/schedules/ScheduleCalendar.tsx
touch talkplatform-frontend/components/schedules/CreateScheduleForm.tsx
touch talkplatform-frontend/components/schedules/ScheduleList.tsx
```

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 1

---

#### 2. Student Booking System (Tuần 3-4)
**Cần tạo**:
- Migration: Bảng `bookings`
- Entity: `Booking`
- Service: Logic booking với transaction
- Controller: API endpoints
- Frontend: Booking flow UI

**Quan trọng**: Phải sử dụng **Database Transaction** để đảm bảo ACID!

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 2

---

#### 3. Wallet & Payment (Tuần 5-6)
**Cần tạo**:
- Migration: Bảng `wallets`, `transactions`
- Service: Wallet operations
- Admin tool: Mock deposit
- Frontend: Transaction history

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 3

---

### 📊 Priority MEDIUM - Làm sau

#### 4. Affiliate System (Tuần 7-8)
- Referral code generation
- Commission calculation
- Tracking system

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 4

---

#### 5. Marketplace Enhancement (Tuần 9-10)
- Preview generation (PDF first 3 pages)
- Signed URLs for download
- Purchase flow

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 5

---

### 🎨 Priority LOW - Làm cuối

#### 6. Advanced Lobby Features (Tuần 11-12)
- Room filters
- GeoIP matching
- Topic-based chat

**Xem chi tiết**: `IMPLEMENTATION_PLAN.md` - Phase 6

---

## 🚀 Bắt đầu ngay

### Option 1: Tự triển khai theo plan
1. Đọc `IMPLEMENTATION_PLAN.md`
2. Follow từng phase
3. Test kỹ mỗi feature

### Option 2: Yêu cầu hỗ trợ từng phần
Bạn có thể yêu cầu tôi:
- "Giúp tôi hoàn thiện Schedule Service"
- "Tạo Booking System với transaction"
- "Implement Wallet API"
- v.v.

---

## 📁 Cấu trúc thư mục đề xuất

```
talkplatform-backend/
├── src/
│   ├── features/
│   │   ├── schedules/          # ✅ Đã tạo một phần
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   ├── schedules.service.ts      # TODO
│   │   │   ├── schedules.controller.ts   # TODO
│   │   │   └── schedules.module.ts       # TODO
│   │   ├── bookings/           # TODO
│   │   ├── wallets/            # TODO
│   │   ├── affiliates/         # TODO
│   │   └── marketplace/        # ✅ Đã có cơ bản
│   └── database/
│       └── migrations/
│           └── 1764065000000-CreateSchedulesTable.ts  # ✅

talkplatform-frontend/
├── components/
│   ├── schedules/              # TODO
│   ├── bookings/               # TODO
│   ├── wallet/                 # TODO
│   └── marketplace/            # ✅ Đã có
├── api/
│   ├── schedules.rest.ts       # TODO
│   ├── bookings.rest.ts        # TODO
│   └── wallet.rest.ts          # TODO
└── app/
    ├── schedules/              # TODO
    ├── bookings/               # TODO
    └── wallet/                 # TODO
```

---

## 🧪 Testing Checklist

Mỗi feature cần test:
- [ ] Unit tests (Service layer)
- [ ] Integration tests (API endpoints)
- [ ] E2E tests (Complete flow)
- [ ] Manual testing (UI/UX)

---

## 🔒 Security Checklist

- [ ] Authorization checks (Teacher/Student roles)
- [ ] Input validation (DTOs)
- [ ] SQL injection prevention (TypeORM parameterized queries)
- [ ] XSS protection (Sanitize inputs)
- [ ] Rate limiting (Prevent abuse)
- [ ] Transaction safety (ACID compliance)

---

## 📊 Database Migration Commands

```bash
# Generate new migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migrations
npm run migration:show
```

---

## 🎯 Next Steps

### Ngay bây giờ:
1. **Review** `IMPLEMENTATION_PLAN.md`
2. **Quyết định** bắt đầu từ feature nào
3. **Yêu cầu** tôi hỗ trợ chi tiết cho feature đó

### Ví dụ request:
- "Giúp tôi hoàn thiện Schedule Service với logic validate không trùng lịch"
- "Tạo Booking API với database transaction"
- "Implement Wallet deposit và transaction history"

---

## 💡 Tips

1. **Làm từng feature một**: Đừng làm song song nhiều feature
2. **Test kỹ trước khi chuyển feature khác**: Đảm bảo không có bug
3. **Commit thường xuyên**: Mỗi feature hoàn thành nên commit
4. **Document code**: Viết comment cho logic phức tạp
5. **Follow coding standards**: Consistent với code hiện tại

---

## 📞 Support

Nếu cần hỗ trợ, hãy cho tôi biết:
1. Feature nào bạn muốn làm
2. Phần nào bạn cần giúp (Backend/Frontend/Both)
3. Có vấn đề gì đang gặp phải không

Tôi sẽ cung cấp:
- ✅ Complete code
- ✅ Detailed explanation
- ✅ Testing guide
- ✅ Troubleshooting tips

---

**Ready to start? Let me know which feature you want to implement first!** 🚀
