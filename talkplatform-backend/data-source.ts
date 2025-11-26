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
import { LiveKitMetric } from './src/metrics/livekit-metric.entity';
import { Course } from './src/features/courses/entities/course.entity';
import { CourseSession } from './src/features/courses/entities/course-session.entity';
import { SessionMaterial } from './src/features/courses/entities/session-material.entity';
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
import { SessionPurchase } from './src/features/courses/entities/session-purchase.entity';
import { PaymentHold } from './src/features/courses/entities/payment-hold.entity';
import { TeacherReview } from './src/features/teachers/entities/teacher-review.entity';
import { TeacherAvailability } from './src/features/teachers/entities/teacher-availability.entity';

dotenv.config(); // Nạp .env

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'talkplatform',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',

  // *** SỬA LẠI 2 DÒNG SAU ĐÂY (SỬ DỤNG path.join) ***
  //entities: [path.join(__dirname, 'src', '**', '*.entity{.ts,.js}')], // Tìm Entities
  entities: [
    User,
    TeacherProfile,
    Meeting,
    MeetingParticipant,
    MeetingChatMessage,
    Classroom,
    ClassroomMember,
    BandwidthMetric,
    MetricsHourly,
    LiveKitMetric,
    Course,
    CourseSession,
    SessionMaterial,
    CourseEnrollment,
    SessionPurchase,
    PaymentHold,
    TeacherReview,
    TeacherAvailability,
  ],
  migrations: [path.join(__dirname, 'src', 'database', 'migrations', '*{.ts,.js}')], // Đường dẫn migrations chính xác
  migrationsTableName: 'migrations_typeorm', // Tên bảng migrations

};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;