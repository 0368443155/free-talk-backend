import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { Course } from './course.entity';

export enum SessionStatus {
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('course_sessions')
@Index(['course_id'])
@Index(['status'])
@Index(['scheduled_date'])
@Index(['course_id', 'session_number'], { unique: true })
export class CourseSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    course_id: string;

    @ManyToOne(() => Course, course => course.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Column({ type: 'integer' })
    session_number: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'date' })
    scheduled_date: Date;

    @Column({ type: 'time' })
    start_time: string;

    @Column({ type: 'time' })
    end_time: string;

    @Column({ type: 'integer' })
    duration_minutes: number;

    @Column({
        type: 'varchar',
        length: 50,
        default: SessionStatus.SCHEDULED,
    })
    status: SessionStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    livekit_room_name: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    meeting_link: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    meeting_id: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    qr_code_url: string;

    @Column({ type: 'text', nullable: true })
    qr_code_data: string; // JSON string with session info

    @Column({ type: 'timestamp', nullable: true })
    actual_start_time: Date;

    @Column({ type: 'timestamp', nullable: true })
    actual_end_time: Date;

    @Column({ type: 'integer', nullable: true })
    actual_duration_minutes: number;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // Virtual properties
    get is_scheduled(): boolean {
        return this.status === SessionStatus.SCHEDULED;
    }

    get is_ongoing(): boolean {
        return this.status === SessionStatus.ONGOING;
    }

    get is_in_progress(): boolean {
        return this.status === SessionStatus.ONGOING;
    }

    get is_completed(): boolean {
        return this.status === SessionStatus.COMPLETED;
    }

    get is_cancelled(): boolean {
        return this.status === SessionStatus.CANCELLED;
    }

    get scheduled_datetime(): Date {
        const [hours, minutes] = this.start_time.split(':');
        const date = new Date(this.scheduled_date);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date;
    }

    get is_past(): boolean {
        return this.scheduled_datetime < new Date();
    }

    get is_upcoming(): boolean {
        return this.scheduled_datetime > new Date();
    }
}
