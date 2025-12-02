import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('metrics_daily')
@Index(['date', 'protocol'], { unique: true })
export class MetricsDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({ type: 'enum', enum: ['http', 'webrtc'], default: 'http' })
  protocol: string;

  @Column({ type: 'bigint', default: 0 })
  total_bandwidth: number;

  @Column({ type: 'int', default: 0 })
  total_requests: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avg_response_time: number;

  @Column({ type: 'bigint', default: 0 })
  peak_bandwidth: number;

  @Column({ type: 'timestamp', nullable: true })
  peak_hour: Date;

  @Column({ type: 'int', default: 0 })
  unique_users: number;

  @CreateDateColumn()
  created_at: Date;
}


