import { Entity, PrimaryColumn, Column, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../../users/user.entity';
import { TeacherReview } from './teacher-review.entity';
import { TeacherAvailability } from './teacher-availability.entity';

export enum TeacherStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum TeacherSpecialty {
  CONVERSATION = 'conversation',
  BUSINESS = 'business',
  ACADEMIC = 'academic',
  TEST_PREP = 'test_prep',
  KIDS = 'kids',
  PRONUNCIATION = 'pronunciation',
  GRAMMAR = 'grammar',
  WRITING = 'writing'
}

@Entity('teacher_profiles')
@Index(['is_verified'])
@Index(['average_rating', 'total_hours_taught'])
export class TeacherProfile {
  // Note: Old database schema uses user_id as PRIMARY KEY, not a separate id column
  // For compatibility, we use user_id as primary key
  @PrimaryColumn({ type: 'varchar', length: 36 })
  user_id: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Virtual property for compatibility (returns user_id)
  get id(): string {
    return this.user_id;
  }

  // ===== COLUMNS THAT EXIST IN DATABASE =====
  @Column({ type: 'varchar', length: 255, nullable: true })
  headline: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  intro_video_url: string;

  @Column({ type: 'int', default: 1 })
  hourly_rate: number;

  @Column({ type: 'float', default: 0 })
  average_rating: number;

  @Column({ type: 'int', default: 0 })
  total_hours_taught: number;

  @Column({ type: 'tinyint', default: 0 })
  is_verified: boolean;

  // ===== NEW COLUMNS ADDED BY MIGRATION =====
  @Column({ type: 'int', default: 0 })
  total_reviews: number;

  @Column({ type: 'json', nullable: true })
  languages_taught: string[];

  @Column({ type: 'json', nullable: true })
  specialties: TeacherSpecialty[];

  @Column({ type: 'int', default: 0 })
  years_experience: number;

  @Column({ type: 'int', default: 0 })
  total_students: number;

  @Column({ type: 'int', default: 24 })
  avg_response_time_hours: number;

  @Column({ type: 'tinyint', default: 1 })
  is_available: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({
    type: 'enum',
    enum: TeacherStatus,
    default: TeacherStatus.PENDING
  })
  status: TeacherStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourly_rate_credits: number;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updated_at: Date;

  // ===== OPTIONAL PROPERTIES (NOT IN DATABASE YET) =====
  // These are for future use or code compatibility
  education?: string;
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    image_url?: string;
  }>;
  timezone?: string;
  spoken_languages?: Array<{
    language: string;
    level: 'native' | 'fluent' | 'advanced' | 'intermediate';
  }>;
  profile_images?: string[];
  min_session_duration?: number;
  max_session_duration?: number;
  teaching_styles?: string[];
  age_groups?: string[];
  repeat_students?: number;
  response_rate?: number;
  total_earnings?: number;
  monthly_earnings?: number;
  classes_this_month?: number;
  completion_rate?: number;
  affiliate_code?: string;
  affiliate_referrals?: number;
  affiliate_earnings?: number;
  auto_approve_bookings?: boolean;
  booking_lead_time_hours?: number;
  allow_instant_booking?: boolean;
  cancellation_policy?: {
    free_cancellation_hours: number;
    partial_refund_hours: number;
    no_refund_hours: number;
  };
  admin_notes?: string;
  verified_at?: Date;
  last_active_at?: Date;

  // Getter to return the appropriate rate (for compatibility)
  get rate(): number {
    return this.hourly_rate_credits ?? (this.hourly_rate ?? 0);
  }

  // Relations
  @OneToMany(() => TeacherReview, review => review.teacher)
  reviews: TeacherReview[];

  @OneToMany(() => TeacherAvailability, availability => availability.teacher)
  availability: TeacherAvailability[];
}