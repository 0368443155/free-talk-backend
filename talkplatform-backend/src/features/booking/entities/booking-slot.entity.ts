import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TeacherProfile } from '../../teachers/entities/teacher-profile.entity';
import { Booking } from './booking.entity';

/**
 * Booking Slot Entity
 * 
 * Đại diện cho một slot thời gian có thể đặt
 * Sử dụng Pessimistic Locking khi đặt chỗ để tránh double booking
 */
@Entity('booking_slots')
@Index(['teacher_id', 'start_time', 'end_time'])
@Index(['teacher_id', 'date'])
@Index(['is_booked'])
export class BookingSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeacherProfile, { nullable: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: TeacherProfile;

  @Column({ type: 'uuid', insert: false, update: false })
  teacher_id: string;

  /**
   * Ngày của slot (YYYY-MM-DD)
   */
  @Column({ type: 'date' })
  date: Date;

  /**
   * Thời gian bắt đầu (HH:mm:ss)
   */
  @Column({ type: 'time' })
  start_time: string;

  /**
   * Thời gian kết thúc (HH:mm:ss)
   */
  @Column({ type: 'time' })
  end_time: string;

  /**
   * Đã được đặt chưa
   */
  @Column({ type: 'boolean', default: false })
  is_booked: boolean;

  /**
   * Booking đã đặt slot này (nếu có)
   */
  @OneToOne(() => Booking, (booking) => booking.meeting, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @Column({ type: 'uuid', nullable: true, insert: false, update: false })
  booking_id: string | null;

  /**
   * Học viên đã đặt (nếu có)
   */
  @Column({ type: 'uuid', nullable: true })
  student_id: string | null;

  /**
   * Giá (credits) cho slot này
   */
  @Column({ type: 'int', default: 0 })
  price_credits: number;

  /**
   * Ghi chú
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


