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
import { User } from '../../../users/user.entity';

export enum ScheduleStatus {
    OPEN = 'open',
    FULL = 'full',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
    IN_PROGRESS = 'in_progress',
}

export enum ScheduleLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
}

@Entity('schedules')
@Index(['teacher_id'])
@Index(['status'])
@Index(['start_time', 'end_time'])
@Check(`"end_time" > "start_time"`)
@Check(`"price" >= 0`)
@Check(`"current_students" <= "max_students"`)
export class Schedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    teacher_id: string;

    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'teacher_id' })
    teacher: User;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamp' })
    start_time: Date;

    @Column({ type: 'timestamp' })
    end_time: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'integer', default: 10 })
    max_students: number;

    @Column({ type: 'integer', default: 0 })
    current_students: number;

    @Column({
        type: 'varchar',
        length: 50,
        default: ScheduleStatus.OPEN,
    })
    status: ScheduleStatus;

    @Column({ type: 'varchar', length: 50, nullable: true })
    language: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    level: ScheduleLevel;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // Virtual properties
    get duration(): number {
        return (new Date(this.end_time).getTime() - new Date(this.start_time).getTime()) / (1000 * 60); // minutes
    }

    get is_full(): boolean {
        return this.current_students >= this.max_students;
    }

    get available_slots(): number {
        return this.max_students - this.current_students;
    }

    get is_upcoming(): boolean {
        return new Date(this.start_time) > new Date();
    }

    get is_past(): boolean {
        return new Date(this.end_time) < new Date();
    }

    get is_active(): boolean {
        const now = new Date();
        return new Date(this.start_time) <= now && new Date(this.end_time) >= now;
    }
}
