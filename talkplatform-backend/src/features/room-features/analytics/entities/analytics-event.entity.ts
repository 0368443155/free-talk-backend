import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EventType {
  ROOM_CREATED = 'room_created',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  MESSAGE_SENT = 'message_sent',
  HAND_RAISED = 'hand_raised',
  SCREEN_SHARED = 'screen_shared',
  RECORDING_STARTED = 'recording_started',
  POLL_CREATED = 'poll_created',
  REACTION_SENT = 'reaction_sent',
  YOUTUBE_PLAYED = 'youtube_played',
}

@Entity('analytics_events')
@Index(['roomId', 'eventType', 'timestamp'])
@Index(['userId', 'timestamp'])
@Index(['timestamp'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  roomId: string;

  @Column({ type: 'varchar', length: 50 })
  roomType: string;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  @Index()
  eventType: EventType;

  @Column({ type: 'json' })
  eventData: Record<string, any>;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}

