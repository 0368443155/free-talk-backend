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
    Check,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { CourseSession } from './course-session.entity';

export enum CourseStatus {
    UPCOMING = 'upcoming',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum CourseLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
}

export enum PriceType {
    PER_SESSION = 'per_session',
    FULL_COURSE = 'full_course',
}

@Entity('courses')
@Index(['teacher_id'])
@Index(['status'])
@Check(`(price_type = 'per_session' AND price_per_session >= 1.00) OR (price_type = 'full_course' AND price_full_course >= 1.00)`)
@Check(`current_students <= max_students`)
@Check(`total_sessions > 0`)
export class Course {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    teacher_id: string;

    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'teacher_id' })
    teacher: User;

    @OneToMany(() => CourseSession, session => session.course, { cascade: true })
    sessions: CourseSession[];

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'integer' })
    duration_hours: number;

    @Column({ type: 'integer' })
    total_sessions: number;

    @Column({
        type: 'varchar',
        length: 20,
    })
    price_type: PriceType;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price_per_session: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price_full_course: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    language: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    level: CourseLevel;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string;

    @Column({
        type: 'varchar',
        length: 50,
        default: CourseStatus.UPCOMING,
    })
    status: CourseStatus;

    @Column({ type: 'integer', default: 20 })
    max_students: number;

    @Column({ type: 'integer', default: 0 })
    current_students: number;

    @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
    affiliate_code: string;

    @Column({ type: 'text', nullable: true })
    qr_code_url: string;

    @Column({ type: 'text', nullable: true })
    share_link: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // Virtual properties
    get is_full(): boolean {
        return this.current_students >= this.max_students;
    }

    get available_slots(): number {
        return this.max_students - this.current_students;
    }

    get is_upcoming(): boolean {
        return this.status === CourseStatus.UPCOMING;
    }

    get is_ongoing(): boolean {
        return this.status === CourseStatus.ONGOING;
    }

    get is_completed(): boolean {
        return this.status === CourseStatus.COMPLETED;
    }

    get is_cancelled(): boolean {
        return this.status === CourseStatus.CANCELLED;
    }

    get price(): number {
        if (this.price_type === PriceType.PER_SESSION) {
            return this.price_per_session;
        }
        return this.price_full_course;
    }
}
