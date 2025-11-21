# 🚀 KẾHOẠCH TRIỂN KHAI CHI TIẾT

**Ngày tạo:** 2025-11-21  
**Mục tiêu:** Hoàn thiện TalkPlatform theo đúng yêu cầu  
**Timeline:** 6 tuần

---

## ✅ BƯỚC 1: SETUP CƠ BẢN (Đã hoàn thành)

- [x] Chạy SQL script tạo missing tables
- [x] Fix frontend build errors
- [x] Tạo các tài liệu audit và checklist

---

## 🎯 BƯỚC 2: MODULE 6 - MARKETPLACE (Tuần 1-2) - ƯU TIÊN CAO

### 2.1. Backend - Entities & DTOs (Ngày 1-2)

#### Tạo Entities:
```bash
cd talkplatform-backend/src/features
mkdir marketplace
cd marketplace
mkdir entities dto services controllers
```

**Files cần tạo:**
1. `entities/material-category.entity.ts`
2. `entities/material.entity.ts`
3. `entities/material-purchase.entity.ts`
4. `entities/material-review.entity.ts`

#### Tạo DTOs:
1. `dto/create-material.dto.ts`
2. `dto/update-material.dto.ts`
3. `dto/filter-material.dto.ts`
4. `dto/create-review.dto.ts`

### 2.2. Backend - Services (Ngày 3-4)

**Files cần tạo:**
1. `services/material.service.ts` - CRUD cho materials
2. `services/material-purchase.service.ts` - Xử lý mua hàng
3. `services/material-review.service.ts` - Quản lý reviews
4. `services/upload.service.ts` - Upload file lên AWS S3

**Setup AWS S3:**
```bash
cd talkplatform-backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Tạo `.env` variables:
```
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=talkplatform-materials
```

### 2.3. Backend - Controllers (Ngày 5-6)

**Files cần tạo:**
1. `controllers/student-material.controller.ts` - Student endpoints
2. `controllers/teacher-material.controller.ts` - Teacher endpoints
3. `controllers/admin-material.controller.ts` - Admin endpoints

**API Endpoints cần implement:**

**Student APIs:**
- `GET /api/v1/marketplace/materials` - Browse materials
- `GET /api/v1/marketplace/materials/:id` - View detail
- `POST /api/v1/marketplace/materials/:id/purchase` - Purchase
- `GET /api/v1/marketplace/my-purchases` - My purchased materials
- `POST /api/v1/marketplace/materials/:id/review` - Add review
- `GET /api/v1/marketplace/materials/:id/download` - Download purchased

**Teacher APIs:**
- `POST /api/v1/marketplace/teacher/materials` - Upload material
- `GET /api/v1/marketplace/teacher/materials` - My materials
- `PATCH /api/v1/marketplace/teacher/materials/:id` - Update material
- `DELETE /api/v1/marketplace/teacher/materials/:id` - Delete material
- `GET /api/v1/marketplace/teacher/sales` - Sales statistics

**Admin APIs:**
- `GET /api/v1/marketplace/admin/materials` - All materials
- `PATCH /api/v1/marketplace/admin/materials/:id/approve` - Approve
- `PATCH /api/v1/marketplace/admin/materials/:id/reject` - Reject

### 2.4. Frontend - Components (Ngày 7-10)

**Tạo folder structure:**
```bash
cd talkplatform-frontend
mkdir -p app/marketplace
mkdir -p components/marketplace
```

**Pages cần tạo:**
1. `app/marketplace/page.tsx` - Browse marketplace
2. `app/marketplace/[id]/page.tsx` - Material detail
3. `app/marketplace/my-purchases/page.tsx` - My purchases
4. `app/teacher/materials/page.tsx` - Teacher materials management
5. `app/teacher/materials/upload/page.tsx` - Upload new material

**Components cần tạo:**
1. `components/marketplace/material-card.tsx`
2. `components/marketplace/material-grid.tsx`
3. `components/marketplace/material-filters.tsx`
4. `components/marketplace/purchase-modal.tsx`
5. `components/marketplace/review-form.tsx`
6. `components/marketplace/upload-form.tsx`

---

## 💳 BƯỚC 3: PAYMENT INTEGRATION (Tuần 3) - ƯU TIÊN CAO

### 3.1. Setup Payment Providers

**Install packages:**
```bash
cd talkplatform-backend
npm install stripe @paypal/checkout-server-sdk
```

### 3.2. Backend - Payment Service

**Files cần tạo:**
1. `src/features/payment/services/stripe.service.ts`
2. `src/features/payment/services/paypal.service.ts`
3. `src/features/payment/services/vnpay.service.ts`
4. `src/features/payment/controllers/payment.controller.ts`
5. `src/features/payment/controllers/webhook.controller.ts`

**API Endpoints:**
- `POST /api/v1/payment/create-intent` - Create payment intent
- `POST /api/v1/payment/confirm` - Confirm payment
- `POST /api/v1/payment/webhook/stripe` - Stripe webhook
- `POST /api/v1/payment/webhook/paypal` - PayPal webhook
- `GET /api/v1/payment/methods` - Get saved payment methods
- `POST /api/v1/payment/methods` - Add payment method

### 3.3. Frontend - Payment UI

**Pages:**
1. `app/credits/purchase/page.tsx` - Purchase credits page
2. `app/payment/success/page.tsx` - Success page
3. `app/payment/cancel/page.tsx` - Cancel page

**Components:**
1. `components/payment/credit-packages.tsx`
2. `components/payment/payment-method-selector.tsx`
3. `components/payment/stripe-checkout.tsx`

---

## ⚡ BƯỚC 4: AUTO CREDIT DEDUCTION (Tuần 3) - ƯU TIÊN CAO

### 4.1. Backend - Credit Service Enhancement

**File cần sửa:**
`src/features/credit/credit.service.ts`

**Thêm methods:**
```typescript
async deductCreditsForMeeting(userId, meetingId, amount)
async refundCredits(userId, amount, reason)
async calculateRevenueSplit(amount, teacherId, affiliateId?)
```

### 4.2. Backend - Meeting Service Integration

**File cần sửa:**
`src/features/meeting/meeting.service.ts`

**Thêm logic:**
- Khi user join meeting có phí → Tự động trừ credit
- Khi meeting kết thúc → Tính revenue split cho teacher
- Khi user cancel booking → Refund credits (nếu đủ điều kiện)

### 4.3. Backend - Revenue Share Service

**File cần tạo:**
`src/features/revenue/revenue-share.service.ts`

**Functions:**
- Calculate 70/30 split (teacher/platform)
- Calculate affiliate commission (10%)
- Track revenue in `revenue_shares` table

---

## 📊 BƯỚC 5: TEACHER PROFILE ENHANCEMENTS (Tuần 4)

### 5.1. Backend - Teacher Media

**Files cần tạo:**
1. `src/features/teachers/entities/teacher-media.entity.ts`
2. `src/features/teachers/services/teacher-media.service.ts`

**API Endpoints:**
- `POST /api/v1/teachers/me/media` - Upload media
- `GET /api/v1/teachers/:id/media` - Get teacher media
- `DELETE /api/v1/teachers/me/media/:id` - Delete media

### 5.2. Backend - Teacher Ranking

**Files cần tạo:**
1. `src/features/teachers/entities/teacher-ranking.entity.ts`
2. `src/features/teachers/services/teacher-ranking.service.ts`
3. `src/features/teachers/tasks/calculate-rankings.task.ts` - Cron job

**Ranking formula:**
```
Score = (Rating × 0.4) + (Hours × 0.3) + (Reviews × 0.15) + (Response × 0.1) + (Completion × 0.05)
```

### 5.3. Frontend - Teacher Profile Page

**Files cần sửa/tạo:**
1. `app/teachers/[id]/page.tsx` - Enhanced profile
2. `components/teacher/media-gallery.tsx`
3. `components/teacher/ranking-badge.tsx`
4. `components/teacher/statistics-card.tsx`

---

## 🎓 BƯỚC 6: CLASSROOM ENHANCEMENTS (Tuần 4-5)

### 6.1. Backend - Bookings

**Files cần tạo:**
1. `src/features/classroom/entities/booking.entity.ts`
2. `src/features/classroom/services/booking.service.ts`
3. `src/features/classroom/controllers/booking.controller.ts`

**API Endpoints:**
- `POST /api/v1/classrooms/:id/book` - Book a class
- `GET /api/v1/bookings/my-bookings` - My bookings
- `PATCH /api/v1/bookings/:id/cancel` - Cancel booking
- `GET /api/v1/teacher/bookings` - Teacher's bookings

### 6.2. Backend - Resources & Announcements

**Files cần tạo:**
1. `src/features/classroom/entities/classroom-resource.entity.ts`
2. `src/features/classroom/entities/classroom-announcement.entity.ts`
3. `src/features/classroom/services/classroom-resource.service.ts`
4. `src/features/classroom/services/classroom-announcement.service.ts`

### 6.3. Frontend - Classroom UI

**Files cần tạo:**
1. `app/classrooms/[id]/resources/page.tsx`
2. `app/classrooms/[id]/announcements/page.tsx`
3. `components/classroom/resource-list.tsx`
4. `components/classroom/announcement-card.tsx`

---

## 🎮 BƯỚC 7: FREE TALK ENHANCEMENTS (Tuần 5)

### 7.1. Backend - Global Chat

**Files cần tạo:**
1. `src/features/chat/entities/global-chat-message.entity.ts`
2. `src/features/chat/services/global-chat.service.ts`
3. `src/features/chat/gateways/global-chat.gateway.ts` - WebSocket

### 7.2. Backend - User Matching

**Files cần tạo:**
1. `src/features/matching/entities/user-matching-preference.entity.ts`
2. `src/features/matching/entities/match-history.entity.ts`
3. `src/features/matching/services/matching.service.ts`
4. `src/features/matching/services/matching-algorithm.service.ts`

**Matching algorithm:**
- Language compatibility
- Level compatibility
- Topic interests
- Region/timezone
- Availability

### 7.3. Frontend - Lobby Enhancement

**Files cần sửa:**
1. `app/lobby/page.tsx` - Add global chat
2. `components/lobby/global-chat.tsx`
3. `components/lobby/matching-preferences.tsx`
4. `components/lobby/suggested-matches.tsx`

---

## 💰 BƯỚC 8: WITHDRAWAL SYSTEM (Tuần 5-6)

### 8.1. Backend - Withdrawal Service

**Files cần tạo:**
1. `src/features/withdrawal/entities/withdrawal-request.entity.ts`
2. `src/features/withdrawal/services/withdrawal.service.ts`
3. `src/features/withdrawal/controllers/withdrawal.controller.ts`

**API Endpoints:**
- `POST /api/v1/withdrawal/request` - Request withdrawal
- `GET /api/v1/withdrawal/my-requests` - My requests
- `GET /api/v1/admin/withdrawal/pending` - Admin: pending requests
- `PATCH /api/v1/admin/withdrawal/:id/approve` - Admin: approve
- `PATCH /api/v1/admin/withdrawal/:id/reject` - Admin: reject

### 8.2. Frontend - Withdrawal UI

**Files cần tạo:**
1. `app/teacher/earnings/page.tsx` - Earnings dashboard
2. `app/teacher/withdrawal/page.tsx` - Request withdrawal
3. `components/teacher/earnings-chart.tsx`
4. `components/teacher/withdrawal-form.tsx`

---

## 🔔 BƯỚC 9: NOTIFICATIONS (Tuần 6)

### 9.1. Backend - Notification Service

**Files cần tạo:**
1. `src/features/notifications/entities/notification.entity.ts`
2. `src/features/notifications/services/notification.service.ts`
3. `src/features/notifications/gateways/notification.gateway.ts`
4. `src/features/notifications/controllers/notification.controller.ts`

**Notification types:**
- Booking reminders (24h, 1h before)
- Payment received
- New review
- Material purchased
- Withdrawal approved/rejected

### 9.2. Frontend - Notification UI

**Files cần tạo:**
1. `app/notifications/page.tsx`
2. `components/notifications/notification-bell.tsx`
3. `components/notifications/notification-list.tsx`
4. `components/notifications/notification-item.tsx`

---

## 📧 BƯỚC 10: EMAIL SYSTEM (Tuần 6)

### 10.1. Backend - Email Service

**Install:**
```bash
npm install @nestjs-modules/mailer nodemailer
npm install @types/nodemailer --save-dev
```

**Files cần tạo:**
1. `src/features/email/email.service.ts`
2. `src/features/email/email.module.ts`
3. `src/features/email/templates/` - Email templates
4. `src/features/email/tasks/email-queue.task.ts` - Process queue

**Email templates:**
- Welcome email
- Booking confirmation
- Booking reminder
- Payment receipt
- Withdrawal confirmation

---

## 🧪 BƯỚC 11: TESTING & OPTIMIZATION

### 11.1. Backend Testing
- Unit tests cho services
- Integration tests cho APIs
- E2E tests cho critical flows

### 11.2. Frontend Testing
- Component tests
- Integration tests
- E2E tests với Playwright/Cypress

### 11.3. Performance Optimization
- Database indexing
- Query optimization
- Caching với Redis
- CDN cho static assets
- Image optimization

---

## 📝 CHECKLIST TỔNG QUAN

### Backend (58 APIs cần implement)
- [ ] 15 Marketplace APIs
- [ ] 8 Payment APIs
- [ ] 6 Booking APIs
- [ ] 5 Withdrawal APIs
- [ ] 4 Teacher Media APIs
- [ ] 4 Classroom Resource APIs
- [ ] 4 Notification APIs
- [ ] 12 Other APIs

### Frontend (35+ pages cần tạo)
- [ ] 6 Marketplace pages
- [ ] 3 Payment pages
- [ ] 4 Teacher pages
- [ ] 3 Classroom pages
- [ ] 2 Withdrawal pages
- [ ] 1 Notification page
- [ ] 16+ Other pages

### Database
- [x] 20 tables created
- [ ] Indexes optimized
- [ ] Views created
- [ ] Sample data inserted

---

## 🚀 BẮT ĐẦU NGAY

**Bước tiếp theo:**
1. ✅ Chạy SQL script (đang chờ)
2. 🔄 Tạo Marketplace entities
3. 🔄 Tạo Upload service với AWS S3
4. 🔄 Implement Marketplace APIs

**Câu hỏi cho bạn:**
1. Bạn có AWS account để setup S3 không?
2. Bạn muốn dùng Stripe hay PayPal cho payment?
3. Bạn muốn bắt đầu với module nào trước?
