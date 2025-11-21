import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TeacherProfile } from './teacher-profile.entity';

export enum WeekDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export enum AvailabilityType {
  REGULAR = 'regular',     // Weekly recurring
  EXCEPTION = 'exception', // One-time override
  VACATION = 'vacation'    // Time off
}

@Entity('teacher_availability')
@Index(['teacher_id', 'day_of_week'])
@Index(['teacher_id', 'date', 'availability_type'])
export class TeacherAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeacherProfile, { nullable: false })
  teacher: TeacherProfile;

  @Column({ type: 'uuid' })
  teacher_id: string;

  @Column({
    type: 'enum',
    enum: AvailabilityType,
    default: AvailabilityType.REGULAR
  })
  availability_type: AvailabilityType;

  @Column({
    type: 'enum',
    enum: WeekDay,
    nullable: true
  })
  day_of_week: WeekDay; // For regular availability

  @Column({ type: 'date', nullable: true })
  date: Date; // For specific date exceptions

  @Column({ type: 'time' })
  start_time: string; // '09:00'

  @Column({ type: 'time' })
  end_time: string; // '17:00'

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string; // 'Asia/Ho_Chi_Minh'

  @Column({ type: 'boolean', default: true })
  is_available: boolean; // False for vacation/time off

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  max_bookings: number; // Max concurrent bookings in this slot

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}