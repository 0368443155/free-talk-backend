# 🚀 Implementation Guide - EdTech Platform

## ✅ Đã hoàn thành

### 1. Storage Abstraction Layer ✅
- **Location**: `src/core/storage/`
- **Files**:
  - `storage.interface.ts` - Interface định nghĩa
  - `local-storage.service.ts` - Lưu trữ local (cho MVP)
  - `cloud-storage.service.ts` - Cloudflare R2 / AWS S3
  - `storage.module.ts` - NestJS Module
  - `storage.controller.ts` - API endpoints

**Cấu hình**:
```env
STORAGE_PROVIDER=local  # hoặc 'r2' hoặc 's3'
STORAGE_BUCKET_NAME=your-bucket-name
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com  # Cho R2
STORAGE_REGION=auto  # Cho R2, hoặc us-east-1 cho S3
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_PUBLIC_URL=https://your-cdn-domain.com  # Optional
```

**API Endpoints**:
- `POST /api/v1/storage/upload` - Upload file trực tiếp
- `GET /api/v1/storage/presigned-upload?key=...&mimeType=...` - Pre-signed upload URL
- `GET /api/v1/storage/presigned-download?key=...` - Pre-signed download URL
- `DELETE /api/v1/storage/:key` - Xóa file
- `GET /api/v1/storage/:key/metadata` - Lấy metadata

### 2. Booking System với Pessimistic Locking ✅
- **Location**: `src/features/booking/`
- **Files**:
  - `entities/booking.entity.ts` - Booking entity
  - `entities/booking-slot.entity.ts` - Slot entity
  - `booking.service.ts` - Service với SELECT...FOR UPDATE
  - `booking.controller.ts` - API endpoints
  - `booking.module.ts` - NestJS Module

**Tính năng**:
- ✅ Pessimistic Locking để tránh double booking
- ✅ Transaction-safe booking creation
- ✅ Credit deduction khi đặt lịch
- ✅ Cancellation với refund policy
- ✅ Booking history

**API Endpoints**:
- `POST /api/v1/bookings` - Đặt lịch
- `GET /api/v1/bookings/my-bookings` - Lấy danh sách bookings
- `GET /api/v1/bookings/:id` - Lấy booking theo ID
- `PATCH /api/v1/bookings/:id/cancel` - Hủy booking

### 3. Teacher KYC Module ✅
- **Location**: `src/features/teachers/`
- **Files**:
  - `entities/teacher-verification.entity.ts` - Verification entity
  - `dto/submit-verification.dto.ts` - DTOs
  - `teacher-verification.service.ts` - Service
  - `teacher-verification.controller.ts` - Controller

**Tính năng**:
- ✅ Submit verification documents
- ✅ Admin approval/rejection workflow
- ✅ Document storage với pre-signed URLs
- ✅ Status tracking (pending, approved, rejected, info_needed)

**API Endpoints**:
- `POST /api/v1/teachers/verification/submit` - Nộp hồ sơ
- `GET /api/v1/teachers/verification/status` - Lấy trạng thái
- `PATCH /api/v1/teachers/verification/:id/approve` - Admin: Duyệt
- `PATCH /api/v1/teachers/verification/:id/reject` - Admin: Từ chối
- `PATCH /api/v1/teachers/verification/:id/request-info` - Admin: Yêu cầu bổ sung
- `GET /api/v1/teachers/verification/:id/document/:documentKey` - Lấy document URL

## 📋 Cần triển khai tiếp

### 4. Wallet & Payment Module (Double-Entry Ledger)
**Status**: ⚠️ Đã có CreditsService nhưng chưa có Double-Entry Ledger

**Cần tạo**:
```
src/features/wallet/
├── entities/
│   ├── ledger-transaction.entity.ts
│   └── ledger-entry.entity.ts
├── wallet.service.ts
└── wallet.module.ts
```

**Double-Entry Ledger Schema**:
```typescript
@Entity('ledger_transactions')
export class LedgerTransaction {
  id: string;
  description: string;
  transaction_group_id: string; // Nhóm các entries cùng một transaction
  created_at: Date;
}

@Entity('ledger_entries')
export class LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string; // user_id hoặc 'platform', 'escrow', etc.
  amount: number; // + hoặc -
  type: 'DEBIT' | 'CREDIT';
  balance_after: number;
}
```

**Nguyên tắc**: Tổng tất cả entries trong một transaction_group phải = 0

### 5. Marketplace Module
**Status**: ⚠️ Đã có cơ bản, cần hoàn thiện

**Cần bổ sung**:
- Preview tài liệu (PDF viewer, video player)
- Purchase flow với credit deduction
- Download với pre-signed URLs
- Material reviews và ratings

### 6. Bandwidth Optimization
**Status**: ⚠️ Đã có LiveKit metrics, cần tối ưu

**Cần implement**:
- ✅ Simulcast (đã có trong LiveKit config)
- ✅ Dynacast (đã có trong LiveKit config)
- ✅ Adaptive Stream (đã có trong LiveKit config)
- ⚠️ Bandwidth monitoring dashboard
- ⚠️ Auto-quality adjustment dựa trên network conditions
- ⚠️ Codec selection (VP8, H.264, AV1)

**File cần tạo**:
```
src/features/bandwidth/
├── bandwidth-monitor.service.ts
├── bandwidth-optimizer.service.ts
└── bandwidth.controller.ts
```

### 7. Content Moderation
**Status**: ❌ Chưa có

**Cần tạo**:
```
src/features/moderation/
├── client-side/
│   └── nsfw-detector.service.ts  # NSFW.js wrapper
├── server-side/
│   ├── moderation-queue.service.ts  # BullMQ queue
│   └── moderation-worker.service.ts  # NudeNet worker
└── moderation.module.ts
```

**Tầng 1: Client-side (NSFW.js)**:
```typescript
import * as nsfwjs from 'nsfwjs';

async checkImage(imageBuffer: Buffer): Promise<{
  isSafe: boolean;
  probability: number;
  category: string;
}> {
  const model = await nsfwjs.load();
  const predictions = await model.classify(imageBuffer);
  // Check if Porn or Hentai > 0.8
}
```

**Tầng 2: Server-side (NudeNet)**:
- Sử dụng BullMQ để queue jobs
- Worker chạy NudeNet (Python hoặc Node.js wrapper)
- Tự động xóa file vi phạm

### 8. Screen Share Content Control
**Status**: ❌ Chưa có

**Cần implement**:
- Capture screenshots từ screen share track
- Chạy qua content moderation
- Block/allow dựa trên kết quả
- Real-time monitoring

**File cần tạo**:
```
src/features/screen-control/
├── screen-monitor.service.ts
└── screen-control.module.ts
```

### 9. Teacher Ranking System (Bayesian Average)
**Status**: ⚠️ Đã có rating, chưa có Bayesian Average

**Cần implement**:
```typescript
// Formula: WR = (v/(v+m)) * R + (m/(v+m)) * C
// v: số lượng reviews
// m: ngưỡng tối thiểu (ví dụ: 5)
// R: điểm trung bình của giáo viên
// C: điểm trung bình của toàn hệ thống

calculateBayesianRating(teacher: TeacherProfile): number {
  const v = teacher.total_reviews;
  const m = 5; // Minimum threshold
  const R = teacher.average_rating;
  const C = 4.5; // System average
  
  return (v / (v + m)) * R + (m / (v + m)) * C;
}
```

### 10. Watch Together YouTube
**Status**: ⚠️ Đã có cơ bản, cần drift correction

**Cần bổ sung**:
- State machine trên server
- Drift correction algorithm
- Late joiner handling
- Seek synchronization

**File cần tạo**:
```
src/features/watch-together/
├── youtube-sync.service.ts
├── state-machine.service.ts
└── watch-together.gateway.ts  # Socket.IO
```

## 🔧 Migration & Setup

### 1. Database Migrations
Tạo migration cho các entities mới:
```bash
npm run migration:generate -- CreateBookingSystem
npm run migration:generate -- CreateTeacherVerification
npm run migration:generate -- CreateStorageTables
```

### 2. Environment Variables
Thêm vào `.env`:
```env
# Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=uploads
STORAGE_BUCKET_NAME=
STORAGE_ENDPOINT=
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=

# Content Moderation
MODERATION_NSFW_THRESHOLD=0.8
MODERATION_QUEUE_NAME=moderation-queue
REDIS_URL=redis://localhost:6379

# Bandwidth
BANDWIDTH_MONITORING_ENABLED=true
BANDWIDTH_ALERT_THRESHOLD_MBPS=10
```

### 3. Dependencies
```bash
# Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Content Moderation (Client-side)
npm install nsfwjs

# Queue (Server-side moderation)
npm install @nestjs/bull bull bullmq
npm install ioredis

# YouTube Sync
npm install socket.io-client
```

## 📊 Monitoring & Observability

### 1. Bandwidth Metrics
- Sử dụng LiveKit metrics endpoint (`:6789/metrics`)
- Prometheus + Grafana dashboard
- Alert khi bandwidth vượt ngưỡng

### 2. Storage Metrics
- Track storage usage (R2/S3)
- Monitor egress bandwidth
- Cost tracking

### 3. Content Moderation Metrics
- Số lượng files được kiểm duyệt
- Tỷ lệ vi phạm
- Response time

## 🎯 Next Steps

1. ✅ Hoàn thiện Storage Module (đã xong)
2. ✅ Hoàn thiện Booking System (đã xong)
3. ✅ Hoàn thiện Teacher KYC (đã xong)
4. ⚠️ Tạo Double-Entry Ledger cho Wallet
5. ⚠️ Implement Content Moderation
6. ⚠️ Implement Screen Share Control
7. ⚠️ Implement Bayesian Ranking
8. ⚠️ Hoàn thiện Watch Together với drift correction
9. ⚠️ Bandwidth optimization dashboard
10. ⚠️ Testing & Documentation

## 📚 Tài liệu tham khảo

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [LiveKit Documentation](https://docs.livekit.io/)
- [NSFW.js](https://github.com/infinitered/nsfwjs)
- [NudeNet](https://github.com/notAI-tech/NudeNet)
- [Bayesian Average](https://en.wikipedia.org/wiki/Bayesian_average)
- [Double-Entry Bookkeeping](https://en.wikipedia.org/wiki/Double-entry_bookkeeping)


