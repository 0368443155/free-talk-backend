import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    Index,
    JoinColumn,
} from 'typeorm';
import { Meeting } from '../../features/meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';

/**
 * LiveKit Event Detail Entity
 * Lưu chi tiết các webhook events từ LiveKit để query và analytics
 */
export enum LiveKitEventType {
    ROOM_STARTED = 'room_started',
    ROOM_FINISHED = 'room_finished',
    PARTICIPANT_JOINED = 'participant_joined',
    PARTICIPANT_LEFT = 'participant_left',
    TRACK_PUBLISHED = 'track_published',
    TRACK_UNPUBLISHED = 'track_unpublished',
}

export enum TrackType {
    AUDIO = 'audio',
    VIDEO = 'video',
}

export enum TrackSource {
    CAMERA = 'camera',
    MICROPHONE = 'microphone',
    SCREEN_SHARE = 'screen_share',
    SCREEN_SHARE_AUDIO = 'screen_share_audio',
}

@Entity('livekit_event_details')
@Index(['meeting_id', 'event_type', 'created_at'])
@Index(['participant_identity', 'created_at'])
@Index(['event_type', 'created_at'])
export class LiveKitEventDetail {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    event_type: LiveKitEventType;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meeting_id: string | null;

    @ManyToOne(() => Meeting, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'meeting_id' })
    meeting: Meeting | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    room_name: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    participant_identity: string | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'participant_user_id' })
    participant_user: User | null;

    @Column({ type: 'varchar', length: 36, nullable: true })
    participant_user_id: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    participant_name: string | null;

    // Track-specific fields
    @Column({ type: 'enum', enum: TrackType, nullable: true })
    track_type: TrackType | null;

    @Column({ type: 'enum', enum: TrackSource, nullable: true })
    track_source: TrackSource | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    track_sid: string | null;

    @Column({ type: 'boolean', nullable: true })
    track_muted: boolean | null;

    // Room-specific fields
    @Column({ type: 'int', nullable: true })
    room_num_participants: number | null;

    @Column({ type: 'int', nullable: true })
    room_duration_seconds: number | null;

    // Full event data as JSON for flexibility
    @Column({ type: 'json', nullable: true })
    event_data: any;

    // Reference to webhook_events table
    @Column({ type: 'int', nullable: true })
    webhook_event_id: number | null;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}

