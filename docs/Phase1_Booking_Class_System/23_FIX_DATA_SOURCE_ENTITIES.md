# FIX: THÊM ENTITIES VÀO DATA-SOURCE.TS

**Ngày:** 05/12/2025  
**Priority:** 🔴 CRITICAL - P0  
**Thời gian:** 30 phút  

---

## 🚨 VẤN ĐỀ

File `data-source.ts` thiếu **rất nhiều entities quan trọng**, đặc biệt là:
- **Booking** và **BookingSlot** - Core của Phase 1!
- **Schedule** - Cần cho auto schedule
- **Notification** - Cần cho notification system
- **Wallet entities** - Cần cho refund logic

**Impact:**
- TypeORM không biết các tables này tồn tại
- Migrations sẽ không chạy đúng
- Services sẽ bị lỗi khi query database
- **HỆ THỐNG KHÔNG THỂ HOẠT ĐỘNG ĐÚNG!**

---

## ✅ GIẢI PHÁP

### Bước 1: Backup File Hiện Tại

```bash
cd talkplatform-backend
cp data-source.ts data-source.ts.backup
```

---

### Bước 2: Thêm Imports

Thêm các imports sau vào đầu file `data-source.ts`:

```typescript
// ===== PHASE 1 CORE ENTITIES =====
// Booking System
import { Booking } from './src/features/booking/entities/booking.entity';
import { BookingSlot } from './src/features/booking/entities/booking-slot.entity';
import { Schedule } from './src/features/schedules/entities/schedule.entity';

// Notification System
import { Notification } from './src/features/notifications/entities/notification.entity';

// Wallet System (for Refund)
import { LedgerEntry } from './src/features/wallet/entities/ledger-entry.entity';
import { LedgerTransaction } from './src/features/wallet/entities/ledger-transaction.entity';

// Credits System
import { CreditPackage } from './src/features/credits/entities/credit-package.entity';
import { CreditTransaction } from './src/features/credits/entities/credit-transaction.entity';

// ===== ADDITIONAL ENTITIES =====
// Room Features
import { Recording } from './src/features/room-features/recording/entities/recording.entity';
import { AnalyticsEvent } from './src/features/room-features/analytics/entities/analytics-event.entity';
import { EngagementMetric } from './src/features/room-features/analytics/entities/engagement-metric.entity';

// LiveKit
import { WebhookEvent } from './src/livekit/entities/webhook-event.entity';
import { LiveKitEventDetail } from './src/livekit/entities/livekit-event-detail.entity';

// Marketplace
import { Material } from './src/features/marketplace/entities/material.entity';
import { MaterialCategory } from './src/features/marketplace/entities/material-category.entity';
import { MaterialPurchase } from './src/features/marketplace/entities/material-purchase.entity';
import { MaterialReview } from './src/features/marketplace/entities/material-review.entity';

// Global Chat
import { GlobalChatMessage } from './src/features/global-chat/entities/global-chat-message.entity';

// Teacher Verification
import { TeacherVerification } from './src/features/teachers/entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from './src/features/teachers/entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './src/features/teachers/entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './src/features/teachers/entities/teacher-verification-reference.entity';
```

---

### Bước 3: Cập Nhật Entities Array

Thay thế entities array trong `dataSourceOptions`:

```typescript
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'talkplatform',
  synchronize: false,
  logging: false,

  entities: [
    // ===== CORE ENTITIES =====
    User,
    TeacherProfile,
    
    // ===== MEETING ENTITIES =====
    Meeting,
    MeetingParticipant,
    MeetingChatMessage,
    MeetingSettings,
    MeetingTag,
    BlockedParticipant,
    
    // ===== CLASSROOM ENTITIES =====
    Classroom,
    ClassroomMember,
    
    // ===== METRICS ENTITIES =====
    BandwidthMetric,
    MetricsHourly,
    LiveKitMetric,
    
    // ===== COURSE ENTITIES =====
    Course,
    CourseSession,
    SessionMaterial,
    Lesson,
    LessonMaterial,
    CourseEnrollment,
    SessionPurchase,
    PaymentHold,
    AttendanceRecord,
    Review,
    CourseTemplate,
    TemplateRating,
    TemplateUsage,
    
    // ===== PAYMENT ENTITIES =====
    Transaction,
    Withdrawal,
    
    // ===== TEACHER ENTITIES =====
    TeacherReview,
    TeacherAvailability,
    TeacherVerification,
    TeacherVerificationDegreeCertificate,
    TeacherVerificationTeachingCertificate,
    TeacherVerificationReference,
    
    // ===== FEATURE FLAGS =====
    FeatureFlag,
    
    // ===== PHASE 1 CORE ENTITIES (CRITICAL!) =====
    Booking,
    BookingSlot,
    Schedule,
    Notification,
    
    // ===== WALLET ENTITIES (for Refund) =====
    LedgerEntry,
    LedgerTransaction,
    
    // ===== CREDITS ENTITIES =====
    CreditPackage,
    CreditTransaction,
    
    // ===== ROOM FEATURES =====
    Recording,
    AnalyticsEvent,
    EngagementMetric,
    
    // ===== LIVEKIT ENTITIES =====
    WebhookEvent,
    LiveKitEventDetail,
    
    // ===== MARKETPLACE ENTITIES =====
    Material,
    MaterialCategory,
    MaterialPurchase,
    MaterialReview,
    
    // ===== GLOBAL CHAT =====
    GlobalChatMessage,
  ],
  
  migrations: [
    path.join(__dirname, 'src', 'migrations', '**', '*{.ts,.js}'),
    path.join(__dirname, 'src', 'database', 'migrations', '**', '*{.ts,.js}'),
  ],
  subscribers: [],
};
```

---

## 📋 CHECKLIST

- [ ] Backup data-source.ts
- [ ] Thêm tất cả imports
- [ ] Cập nhật entities array
- [ ] Verify không có syntax errors
- [ ] Test compile: `npm run build`
- [ ] Run migrations: `npm run migration:show`

---

## 🧪 VERIFICATION

### Test 1: Compile Check
```bash
cd talkplatform-backend
npm run build
```

**Expected:** No errors

---

### Test 2: Migration Check
```bash
npm run migration:show
```

**Expected:** Hiển thị danh sách migrations

---

### Test 3: Backend Startup
```bash
npm run start:dev
```

**Expected:** 
- No entity-related errors
- Backend starts successfully
- Cron jobs running

---

## 📝 FULL FILE EXAMPLE

Đây là file `data-source.ts` hoàn chỉnh sau khi fix:

```typescript
// data-source.ts
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ===== CORE ENTITIES =====
import {
  User,
  TeacherProfile,
  Meeting,
  MeetingParticipant,
  MeetingChatMessage,
  Classroom,
  ClassroomMember,
  BandwidthMetric,
  MetricsHourly,
} from './src/entities';

// ===== MEETING ENTITIES =====
import { MeetingSettings } from './src/features/meeting/entities/meeting-settings.entity';
import { MeetingTag } from './src/features/meeting/entities/meeting-tag.entity';
import { BlockedParticipant } from './src/features/meeting/entities/blocked-participant.entity';

// ===== METRICS =====
import { LiveKitMetric } from './src/metrics/livekit-metric.entity';

// ===== COURSE ENTITIES =====
import { Course } from './src/features/courses/entities/course.entity';
import { CourseSession } from './src/features/courses/entities/course-session.entity';
import { SessionMaterial } from './src/features/courses/entities/session-material.entity';
import { Lesson } from './src/features/courses/entities/lesson.entity';
import { LessonMaterial } from './src/features/courses/entities/lesson-material.entity';
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
import { SessionPurchase } from './src/features/courses/entities/session-purchase.entity';
import { PaymentHold } from './src/features/courses/entities/payment-hold.entity';
import { AttendanceRecord } from './src/features/courses/entities/attendance-record.entity';
import { Review } from './src/features/courses/entities/review.entity';
import { CourseTemplate } from './src/features/courses/entities/course-template.entity';
import { TemplateRating } from './src/features/courses/entities/template-rating.entity';
import { TemplateUsage } from './src/features/courses/entities/template-usage.entity';

// ===== PAYMENT ENTITIES =====
import { Transaction } from './src/features/payments/entities/transaction.entity';
import { Withdrawal } from './src/features/payments/entities/withdrawal.entity';

// ===== TEACHER ENTITIES =====
import { TeacherReview } from './src/features/teachers/entities/teacher-review.entity';
import { TeacherAvailability } from './src/features/teachers/entities/teacher-availability.entity';
import { TeacherVerification } from './src/features/teachers/entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from './src/features/teachers/entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './src/features/teachers/entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './src/features/teachers/entities/teacher-verification-reference.entity';

// ===== FEATURE FLAGS =====
import { FeatureFlag } from './src/core/feature-flags/entities/feature-flag.entity';

// ===== PHASE 1 CORE ENTITIES (CRITICAL!) =====
import { Booking } from './src/features/booking/entities/booking.entity';
import { BookingSlot } from './src/features/booking/entities/booking-slot.entity';
import { Schedule } from './src/features/schedules/entities/schedule.entity';
import { Notification } from './src/features/notifications/entities/notification.entity';

// ===== WALLET ENTITIES (for Refund) =====
import { LedgerEntry } from './src/features/wallet/entities/ledger-entry.entity';
import { LedgerTransaction } from './src/features/wallet/entities/ledger-transaction.entity';

// ===== CREDITS ENTITIES =====
import { CreditPackage } from './src/features/credits/entities/credit-package.entity';
import { CreditTransaction } from './src/features/credits/entities/credit-transaction.entity';

// ===== ROOM FEATURES =====
import { Recording } from './src/features/room-features/recording/entities/recording.entity';
import { AnalyticsEvent } from './src/features/room-features/analytics/entities/analytics-event.entity';
import { EngagementMetric } from './src/features/room-features/analytics/entities/engagement-metric.entity';

// ===== LIVEKIT ENTITIES =====
import { WebhookEvent } from './src/livekit/entities/webhook-event.entity';
import { LiveKitEventDetail } from './src/livekit/entities/livekit-event-detail.entity';

// ===== MARKETPLACE ENTITIES =====
import { Material } from './src/features/marketplace/entities/material.entity';
import { MaterialCategory } from './src/features/marketplace/entities/material-category.entity';
import { MaterialPurchase } from './src/features/marketplace/entities/material-purchase.entity';
import { MaterialReview } from './src/features/marketplace/entities/material-review.entity';

// ===== GLOBAL CHAT =====
import { GlobalChatMessage } from './src/features/global-chat/entities/global-chat-message.entity';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'talkplatform',
  synchronize: false,
  logging: false,

  entities: [
    // ===== CORE ENTITIES =====
    User,
    TeacherProfile,
    
    // ===== MEETING ENTITIES =====
    Meeting,
    MeetingParticipant,
    MeetingChatMessage,
    MeetingSettings,
    MeetingTag,
    BlockedParticipant,
    
    // ===== CLASSROOM ENTITIES =====
    Classroom,
    ClassroomMember,
    
    // ===== METRICS ENTITIES =====
    BandwidthMetric,
    MetricsHourly,
    LiveKitMetric,
    
    // ===== COURSE ENTITIES =====
    Course,
    CourseSession,
    SessionMaterial,
    Lesson,
    LessonMaterial,
    CourseEnrollment,
    SessionPurchase,
    PaymentHold,
    AttendanceRecord,
    Review,
    CourseTemplate,
    TemplateRating,
    TemplateUsage,
    
    // ===== PAYMENT ENTITIES =====
    Transaction,
    Withdrawal,
    
    // ===== TEACHER ENTITIES =====
    TeacherReview,
    TeacherAvailability,
    TeacherVerification,
    TeacherVerificationDegreeCertificate,
    TeacherVerificationTeachingCertificate,
    TeacherVerificationReference,
    
    // ===== FEATURE FLAGS =====
    FeatureFlag,
    
    // ===== PHASE 1 CORE ENTITIES (CRITICAL!) =====
    Booking,
    BookingSlot,
    Schedule,
    Notification,
    
    // ===== WALLET ENTITIES (for Refund) =====
    LedgerEntry,
    LedgerTransaction,
    
    // ===== CREDITS ENTITIES =====
    CreditPackage,
    CreditTransaction,
    
    // ===== ROOM FEATURES =====
    Recording,
    AnalyticsEvent,
    EngagementMetric,
    
    // ===== LIVEKIT ENTITIES =====
    WebhookEvent,
    LiveKitEventDetail,
    
    // ===== MARKETPLACE ENTITIES =====
    Material,
    MaterialCategory,
    MaterialPurchase,
    MaterialReview,
    
    // ===== GLOBAL CHAT =====
    GlobalChatMessage,
  ],
  
  migrations: [
    path.join(__dirname, 'src', 'migrations', '**', '*{.ts,.js}'),
    path.join(__dirname, 'src', 'database', 'migrations', '**', '*{.ts,.js}'),
  ],
  subscribers: [],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
```

---

## ⚠️ LƯU Ý

1. **Thứ tự import không quan trọng** - TypeORM sẽ tự động resolve dependencies
2. **Entities array order không quan trọng** - Nhưng nên group theo logic để dễ đọc
3. **Phải có tất cả entities** - Thiếu entity nào = TypeORM không biết table đó
4. **Migrations path** - Đảm bảo path đúng với thư mục migrations

---

## 🎯 EXPECTED RESULTS

Sau khi fix:
- ✅ Backend compile thành công
- ✅ Migrations show được tất cả migrations
- ✅ Backend start không có entity errors
- ✅ Services có thể query database
- ✅ Cron jobs chạy được

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Priority:** 🔴 CRITICAL - P0  
**Status:** Ready to execute
