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
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

export enum SessionStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    COMPLETED = 'completed',
    ARCHIVED = 'archived',
}

@Entity('course_sessions')
@Index(['course_id'])
@Index(['status'])
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

    // Session is now a GROUP of lessons
    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string; // e.g., "Week 1", "Module 1: Basics"

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'int', default: 0 })
    total_lessons: number;

    @Column({
        type: 'varchar',
        length: 50,
        default: SessionStatus.DRAFT,
        enum: SessionStatus,
    })
    status: SessionStatus;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @OneToMany(() => Lesson, (lesson) => lesson.session, {
        cascade: true,
    })
    lessons: Lesson[];

    // Virtual properties
    get is_draft(): boolean {
        return this.status === SessionStatus.DRAFT;
    }

    get is_published(): boolean {
        return this.status === SessionStatus.PUBLISHED;
    }

    get is_completed(): boolean {
        return this.status === SessionStatus.COMPLETED;
    }

    get is_archived(): boolean {
        return this.status === SessionStatus.ARCHIVED;
    }
}
