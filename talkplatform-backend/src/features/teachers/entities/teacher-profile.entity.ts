import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
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
@Index(['status', 'is_verified'])
@Index(['average_rating', 'total_hours_taught'])
export class TeacherProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: TeacherStatus,
    default: TeacherStatus.PENDING
  })
  status: TeacherStatus;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'boolean', default: true })
  is_available: boolean;

  // Profile Information
  @Column({ type: 'varchar', length: 500 })
  headline: string; // Short catchy description

  @Column({ type: 'text' })
  bio: string; // Detailed biography

  @Column({ type: 'json' })
  languages_taught: string[]; // ['English', 'Spanish']

  @Column({ type: 'json' })
  specialties: TeacherSpecialty[];

  @Column({ type: 'varchar', length: 200, nullable: true })
  education: string;

  @Column({ type: 'json', nullable: true })
  certifications: Array<{
    name: string;
    issuer: string;
    year: number;
    image_url?: string;
  }>;

  @Column({ type: 'int', default: 0 })
  years_experience: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  timezone: string;

  @Column({ type: 'json', nullable: true })
  spoken_languages: Array<{
    language: string;
    level: 'native' | 'fluent' | 'advanced' | 'intermediate';
  }>;

  // Media
  @Column({ type: 'varchar', length: 500, nullable: true })
  intro_video_url: string;

  @Column({ type: 'json', nullable: true })
  profile_images: string[];

  // Teaching Info
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  hourly_rate_credits: number;

  @Column({ type: 'int', default: 30 })
  min_session_duration: number; // minutes

  @Column({ type: 'int', default: 120 })
  max_session_duration: number; // minutes

  @Column({ type: 'json', nullable: true })
  teaching_styles: string[]; // ['interactive', 'structured', 'conversational']

  @Column({ type: 'json', nullable: true })
  age_groups: string[]; // ['kids', 'teens', 'adults', 'seniors']

  // Statistics
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column({ type: 'int', default: 0 })
  total_reviews: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  total_hours_taught: number;

  @Column({ type: 'int', default: 0 })
  total_students: number;

  @Column({ type: 'int', default: 0 })
  repeat_students: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  response_rate: number; // Percentage

  @Column({ type: 'int', default: 24 })
  avg_response_time_hours: number;

  // Earnings & Performance
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_earnings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthly_earnings: number;

  @Column({ type: 'int', default: 0 })
  classes_this_month: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  completion_rate: number; // Percentage of completed vs cancelled classes

  // Affiliate & Marketing
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  affiliate_code: string;

  @Column({ type: 'int', default: 0 })
  affiliate_referrals: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  affiliate_earnings: number;

  // Settings
  @Column({ type: 'boolean', default: true })
  auto_approve_bookings: boolean;

  @Column({ type: 'int', default: 24 })
  booking_lead_time_hours: number;

  @Column({ type: 'boolean', default: true })
  allow_instant_booking: boolean;

  @Column({ type: 'json', nullable: true })
  cancellation_policy: {
    free_cancellation_hours: number;
    partial_refund_hours: number;
    no_refund_hours: number;
  };

  // Admin fields
  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_active_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => TeacherReview, review => review.teacher)
  reviews: TeacherReview[];

  @OneToMany(() => TeacherAvailability, availability => availability.teacher)
  availability: TeacherAvailability[];
}