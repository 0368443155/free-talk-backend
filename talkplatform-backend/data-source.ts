// data-source.ts
import 'reflect-metadata';
import 'dotenv/config'; // Nạp file .env
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path'; // *** THÊM IMPORT NÀY ***
import * as dotenv from 'dotenv';
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
import { MeetingSettings } from './src/features/meeting/entities/meeting-settings.entity';
import { MeetingTag } from './src/features/meeting/entities/meeting-tag.entity';
import { BlockedParticipant } from './src/features/meeting/entities/blocked-participant.entity';
import { LiveKitMetric } from './src/metrics/livekit-metric.entity';
import { Course } from './src/features/courses/entities/course.entity';
import { CourseSession } from './src/features/courses/entities/course-session.entity';
import { SessionMaterial } from './src/features/courses/entities/session-material.entity';
import { Lesson } from './src/features/courses/entities/lesson.entity';
import { LessonMaterial } from './src/features/courses/entities/lesson-material.entity';
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
import { SessionPurchase } from './src/features/courses/entities/session-purchase.entity';
import { PaymentHold } from './src/features/courses/entities/payment-hold.entity';
import { AttendanceRecord } from './src/features/courses/entities/attendance-record.entity';
import { Transaction } from './src/features/payments/entities/transaction.entity';
import { Withdrawal } from './src/features/payments/entities/withdrawal.entity';
import { TeacherReview } from './src/features/teachers/entities/teacher-review.entity';
import { TeacherAvailability } from './src/features/teachers/entities/teacher-availability.entity';
import { FeatureFlag } from './src/core/feature-flags/entities/feature-flag.entity';

import { Review } from './src/features/courses/entities/review.entity';
import { CourseTemplate } from './src/features/courses/entities/course-template.entity';
import { TemplateRating } from './src/features/courses/entities/template-rating.entity';
import { TemplateUsage } from './src/features/courses/entities/template-usage.entity';

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

// ===== TEACHER VERIFICATION =====
import { TeacherVerification } from './src/features/teachers/entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from './src/features/teachers/entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './src/features/teachers/entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './src/features/teachers/entities/teacher-verification-reference.entity';

dotenv.config(); // Nạp .env

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'talkplatform',
  synchronize: false,
  logging: false, // Disable verbose query logs

  // *** SỬA LẠI 2 DÒNG SAU ĐÂY (SỬ DỤNG path.join) ***
  //entities: [path.join(__dirname, 'src', '**', '*.entity{.ts,.js}')], // Tìm Entities
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
  ], // Tìm Migrations
  subscribers: [],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;