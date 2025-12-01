import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('engagement_metrics')
@Index(['roomId', 'date'])
@Index(['date'])
export class EngagementMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  roomId: string;

  @Column({ type: 'varchar', length: 50 })
  roomType: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  // Participation metrics
  @Column({ type: 'int', default: 0 })
  totalParticipants: number;

  @Column({ type: 'int', default: 0 })
  peakConcurrentUsers: number;

  @Column({ type: 'int', default: 0 })
  averageDurationMinutes: number;

  // Interaction metrics
  @Column({ type: 'int', default: 0 })
  totalMessages: number;

  @Column({ type: 'int', default: 0 })
  totalHandRaises: number;

  @Column({ type: 'int', default: 0 })
  totalReactions: number;

  @Column({ type: 'int', default: 0 })
  totalScreenShares: number;

  @Column({ type: 'int', default: 0 })
  totalPolls: number;

  // Engagement score (0-100)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagementScore: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

