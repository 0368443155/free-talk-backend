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
import { CourseSession } from './course-session.entity';

export enum PurchaseStatus {
    ACTIVE = 'active',
    CANCELLED = 'cancelled',
    ATTENDED = 'attended',
    MISSED = 'missed',
}

@Entity('session_purchases')
@Index(['user_id'])
@Index(['session_id'])
@Index(['status'])
export class SessionPurchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36 })
    user_id: string;

    @Column({ type: 'char', length: 36 })
    course_id: string;

    @Column({ type: 'char', length: 36 })
    session_id: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price_paid: number;

    @Column({
        type: 'varchar',
        length: 50,
        default: 'pending',
    })
    payment_status: string;

    @Column({
        type: 'varchar',
        length: 50,
        enum: PurchaseStatus,
        default: PurchaseStatus.ACTIVE,
    })
    status: PurchaseStatus;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    purchased_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelled_at: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    refund_amount: number;

    @Column({ type: 'boolean', default: false })
    attended: boolean;

    @Column({ type: 'int', default: 0 })
    attendance_duration_minutes: number;

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

    @ManyToOne(() => CourseSession, { eager: false })
    @JoinColumn({ name: 'session_id' })
    session: CourseSession;
}
