import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { MeetingParticipant } from './meeting-participant.entity';
import { MeetingChatMessage } from './meeting-chat-message.entity';
import { Classroom } from './classroom.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseSession } from '../../courses/entities/course-session.entity';

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum RoomStatus {
  EMPTY = 'empty',
  AVAILABLE = 'available',
  CROWDED = 'crowded',
  FULL = 'full',
}

export enum MeetingLevel {
  ALL = 'all',
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum MeetingType {
  FREE_TALK = 'free_talk',
  TEACHER_CLASS = 'teacher_class',
  WORKSHOP = 'workshop',
  PRIVATE_SESSION = 'private_session',
}

export enum PricingType {
  FREE = 'free',
  CREDITS = 'credits',
  SUBSCRIPTION = 'subscription',
}

@Entity('meetings')
@Index(['lesson_id'])
@Index(['course_id'])
@Index(['session_id'])
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @Column({ type: 'varchar', length: 36, nullable: true })
  lesson_id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  course_id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  session_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  teacher_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject_name: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'boolean', default: false })
  is_private: boolean;

  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  @Column({ type: 'boolean', default: false })
  is_classroom_only: boolean;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ended_at: Date;

  @Column({ type: 'int', default: 100 })
  max_participants: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtube_video_id: string | null;

  @Column({ type: 'float', default: 0 })
  youtube_current_time: number;

  @Column({ type: 'boolean', default: false })
  youtube_is_playing: boolean;

  @Column({ type: 'json', nullable: true })
  settings: {
    allow_screen_share?: boolean;
    allow_chat?: boolean;
    allow_reactions?: boolean;
    record_meeting?: boolean;
    waiting_room?: boolean;
    auto_record?: boolean;
    mute_on_join?: boolean;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  recording_url: string;

  @Column({ type: 'int', default: 0 })
  total_participants: number;

  @Column({ type: 'int', default: 0 })
  current_participants: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  language: string;

  @Column({
    type: 'enum',
    enum: MeetingLevel,
    nullable: true,
  })
  level: MeetingLevel;

  @Column({ type: 'varchar', length: 500, nullable: true })
  topic: string;

  @Column({
    type: 'enum',
    enum: MeetingType,
    default: MeetingType.FREE_TALK,
  })
  meeting_type: MeetingType;

  @Column({ type: 'int', default: 0 })
  price_credits: number;

  @Column({
    type: 'enum',
    enum: PricingType,
    default: PricingType.FREE,
  })
  pricing_type: PricingType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  is_audio_first: boolean;

  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  affiliate_code: string;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.EMPTY,
  })
  room_status: RoomStatus;

  @Column({ type: 'boolean', default: true })
  allow_microphone: boolean;

  @Column({ type: 'boolean', default: true })
  participants_can_unmute: boolean;

  @Column({ type: 'json', nullable: true })
  blocked_users: string[];

  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting, {
    cascade: true,
  })
  participants: MeetingParticipant[];

  @OneToMany(() => MeetingChatMessage, (message) => message.meeting, {
    cascade: true,
  })
  chat_messages: MeetingChatMessage[];

  // Relations to Course entities
  @ManyToOne(() => Lesson, { nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => CourseSession, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

