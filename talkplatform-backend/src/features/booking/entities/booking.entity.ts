import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';

/**
 * Booking Status
 */
export enum BookingStatus {
  PENDING = 'pending', // Đang chờ xác nhận
  CONFIRMED = 'confirmed', // Đã xác nhận
  CANCELLED = 'cancelled', // Đã hủy
  COMPLETED = 'completed', // Đã hoàn thành
  NO_SHOW = 'no_show', // Học viên không tham gia
}

/**
 * Booking Entity
 * 
 * Lưu trữ thông tin đặt lịch lớp học
 * Sử dụng Pessimistic Locking để tránh double booking
 */
@Entity('bookings')
@Index(['meeting_id'])
@Index(['student_id'])
@Index(['teacher_id'])
@Index(['status'])
@Index(['scheduled_at'])
@Index(['student_id', 'meeting_id'], { unique: true }) // Một học viên chỉ có thể đặt một meeting một lần
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { nullable: false })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'uuid', insert: false, update: false })
  meeting_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'uuid', insert: false, update: false })
  student_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ type: 'uuid', insert: false, update: false })
  teacher_id: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  /**
   * Credits đã thanh toán
   */
  @Column({ type: 'int', default: 0 })
  credits_paid: number;

  /**
   * Credits đã hoàn lại (nếu hủy)
   */
  @Column({ type: 'int', default: 0 })
  credits_refunded: number;

  /**
   * Thời gian lên lịch
   */
  @Column({ type: 'timestamp', precision: 6 })
  scheduled_at: Date;

  /**
   * Thời gian hủy
   */
  @Column({ type: 'timestamp', precision: 6, nullable: true })
  cancelled_at: Date;

  /**
   * Lý do hủy
   */
  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  /**
   * Người hủy (student_id hoặc teacher_id)
   */
  @Column({ type: 'uuid', nullable: true })
  cancelled_by: string;

  /**
   * Thời gian hoàn thành
   */
  @Column({ type: 'timestamp', precision: 6, nullable: true })
  completed_at: Date;

  /**
   * Đã gửi nhắc nhở 24h trước
   */
  @Column({ type: 'boolean', default: false })
  reminder_sent_24h: boolean;

  /**
   * Đã gửi nhắc nhở 1h trước
   */
  @Column({ type: 'boolean', default: false })
  reminder_sent_1h: boolean;

  /**
   * Đã gửi nhắc nhở 20 phút trước (Phase 1 requirement)
   */
  @Column({ type: 'boolean', default: false })
  reminder_sent_20min: boolean;

  /**
   * Thời gian gửi reminder 20 phút
   */
  @Column({ type: 'timestamp', precision: 6, nullable: true })
  reminder_sent_at: Date;

  /**
   * Ghi chú từ học viên
   */
  @Column({ type: 'text', nullable: true })
  student_notes: string;

  /**
   * Ghi chú từ giáo viên
   */
  @Column({ type: 'text', nullable: true })
  teacher_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


