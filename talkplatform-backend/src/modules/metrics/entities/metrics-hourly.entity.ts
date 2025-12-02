import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('metrics_hourly')
@Index(['endpoint', 'method', 'hour_start'], { unique: true })
export class MetricsHourly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'enum', enum: ['http', 'webrtc'], default: 'http' })
  protocol: string;

  @Column({ type: 'timestamp' })
  @Index()
  hour_start: Date;

  @Column({ type: 'int', default: 0 })
  total_requests: number;

  @Column({ type: 'bigint', default: 0 })
  total_inbound: number;

  @Column({ type: 'bigint', default: 0 })
  total_outbound: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avg_response_time: number;

  @Column({ type: 'int', default: 0 })
  max_response_time: number;

  @Column({ type: 'int', default: 0 })
  min_response_time: number;

  @Column({ type: 'int', default: 0 })
  error_count: number;

  @Column({ type: 'int', default: 0 })
  success_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

