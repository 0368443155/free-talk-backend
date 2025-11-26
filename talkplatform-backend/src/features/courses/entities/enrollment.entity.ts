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
import { Course } from './course.entity';

export enum EnrollmentType {
    FULL_COURSE = 'full_course',
    PER_SESSION = 'per_session',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    REFUNDED = 'refunded',
}

export enum EnrollmentStatus {
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

@Entity('course_enrollments')
@Index(['user_id'])
@Index(['course_id'])
@Index(['status'])
export class CourseEnrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36 })
    user_id: string;

    @Column({ type: 'char', length: 36 })
    course_id: string;

    @Column({
        type: 'varchar',
        length: 20,
        enum: EnrollmentType,
    })
    enrollment_type: EnrollmentType;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    total_price_paid: number;

    @Column({
        type: 'varchar',
        length: 50,
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    payment_status: PaymentStatus;

    @Column({
        type: 'varchar',
        length: 50,
        enum: EnrollmentStatus,
        default: EnrollmentStatus.ACTIVE,
    })
    status: EnrollmentStatus;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    enrolled_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelled_at: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    refund_amount: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    completion_percentage: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Relations
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Course, { eager: false })
    @JoinColumn({ name: 'course_id' })
    course: Course;
}
