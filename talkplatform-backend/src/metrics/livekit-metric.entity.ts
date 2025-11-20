import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('livekit_metrics')
@Index(['meetingId', 'userId', 'timestamp'])
@Index(['timestamp'])
export class LiveKitMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  meetingId: string;

  @Column()
  userId: string;

  @Column({ default: 'livekit' })
  platform: string;

  @Column('bigint')
  timestamp: number;

  @Column('int', { default: 0 })
  bitrate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  packetLoss: number;

  @Column('int', { default: 0 })
  jitter: number;

  @Column('int', { default: 0 })
  rtt: number;

  @Column({
    type: 'enum',
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  })
  quality: 'excellent' | 'good' | 'fair' | 'poor';

  @CreateDateColumn()
  createdAt: Date;
}