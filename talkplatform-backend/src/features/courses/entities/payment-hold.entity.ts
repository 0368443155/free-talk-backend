import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { CourseEnrollment } from './enrollment.entity';
import { SessionPurchase } from './session-purchase.entity';

export enum HoldStatus {
    HELD = 'held',
    RELEASED = 'released',
    REFUNDED = 'refunded',
}

@Entity('payment_holds')
@Index(['teacher_id'])
@Index(['student_id'])
@Index(['status'])
export class PaymentHold {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36, nullable: true })
    enrollment_id: string;

    @Column({ type: 'char', length: 36, nullable: true })
    session_purchase_id: string;

    @Column({ type: 'char', length: 36 })
    teacher_id: string;

    @Column({ type: 'char', length: 36 })
    student_id: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'varchar',
        length: 50,
        enum: HoldStatus,
        default: HoldStatus.HELD,
    })
    status: HoldStatus;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    held_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    released_at: Date;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    release_percentage: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    created_at: Date;

    // Relations
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'teacher_id' })
    teacher: User;

    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'student_id' })
    student: User;

    @ManyToOne(() => CourseEnrollment, { eager: false, nullable: true })
    @JoinColumn({ name: 'enrollment_id' })
    enrollment: CourseEnrollment;

    @ManyToOne(() => SessionPurchase, { eager: false, nullable: true })
    @JoinColumn({ name: 'session_purchase_id' })
    sessionPurchase: SessionPurchase;
}
