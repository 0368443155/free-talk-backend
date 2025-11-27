import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CourseSession } from './course-session.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { LessonMaterial } from './lesson-material.entity';

export enum LessonStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('lessons')
@Index(['session_id'])
@Index(['meeting_id'])
@Index(['scheduled_date'])
@Index(['status'])
@Index(['session_id', 'lesson_number'], { unique: true })
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Session reference
  @Column({ type: 'varchar', length: 36 })
  session_id: string;

  // Lesson number within session
  @Column({ type: 'int' })
  lesson_number: number;

  // Lesson info
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Schedule
  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'varchar', length: 10 })
  start_time: string; // "HH:MM"

  @Column({ type: 'varchar', length: 10 })
  end_time: string; // "HH:MM"

  @Column({ type: 'int' })
  duration_minutes: number;

  // Meeting info (auto-generated)
  @Column({ type: 'varchar', length: 36, nullable: true })
  meeting_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  livekit_room_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meeting_link: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qr_code_url: string;

  @Column({ type: 'text', nullable: true })
  qr_code_data: string;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: LessonStatus,
    default: LessonStatus.SCHEDULED,
  })
  status: LessonStatus;

  // Preview & Free Access
  @Column({ type: 'boolean', default: false })
  is_preview: boolean; // Lesson này có phải là preview không

  @Column({ type: 'boolean', default: false })
  is_free: boolean; // Lesson này free cho tất cả users

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CourseSession, (session) => session.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @OneToOne(() => Meeting, { nullable: true })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @OneToMany(() => LessonMaterial, (material) => material.lesson, {
    cascade: true,
  })
  materials: LessonMaterial[];

  // Virtual properties
  get is_scheduled(): boolean {
    return this.status === LessonStatus.SCHEDULED;
  }

  get is_completed(): boolean {
    return this.status === LessonStatus.COMPLETED;
  }

  get is_cancelled(): boolean {
    return this.status === LessonStatus.CANCELLED;
  }

  get scheduled_datetime(): Date {
    const [hours, minutes] = this.start_time.split(':');
    const date = new Date(this.scheduled_date);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  get end_datetime(): Date {
    const [hours, minutes] = this.end_time.split(':');
    const date = new Date(this.scheduled_date);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  get is_past(): boolean {
    return this.end_datetime < new Date();
  }

  get is_upcoming(): boolean {
    return this.scheduled_datetime > new Date();
  }

  get is_ongoing(): boolean {
    const now = new Date();
    return now >= this.scheduled_datetime && now <= this.end_datetime;
  }

  get can_join(): boolean {
    // Allow join 15 minutes before and during lesson
    const now = new Date();
    const joinStartTime = new Date(this.scheduled_datetime.getTime() - 15 * 60 * 1000);
    return now >= joinStartTime && now <= this.end_datetime;
  }
}

