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
import { CourseSession } from './course-session.entity';

export enum MaterialType {
    DOCUMENT = 'document',
    VIDEO = 'video',
    LINK = 'link',
}

@Entity('session_materials')
@Index(['session_id'])
@Index(['type'])
export class SessionMaterial {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 36 })
    session_id: string;

    @Column({
        type: 'enum',
        enum: MaterialType,
    })
    type: MaterialType;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    file_url: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    file_name: string;

    @Column({ type: 'int', nullable: true })
    file_size: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    file_type: string;

    @Column({ type: 'int', default: 0 })
    display_order: number;

    @Column({ type: 'boolean', default: false })
    is_required: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => CourseSession, (session) => session.materials, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: CourseSession;
}

