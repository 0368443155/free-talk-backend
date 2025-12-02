import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('bandwidth_alerts')
export class BandwidthAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'enum', 
    enum: ['threshold', 'spike', 'anomaly'], 
    nullable: false 
  })
  alert_type: string;

  @Column({ 
    type: 'enum', 
    enum: ['low', 'medium', 'high', 'critical'], 
    nullable: false 
  })
  @Index()
  severity: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'bigint' })
  metric_value: number;

  @Column({ type: 'bigint', nullable: true })
  threshold_value: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint: string;

  @Column({ 
    type: 'enum', 
    enum: ['http', 'webrtc'], 
    nullable: true 
  })
  @Index()
  protocol: string;

  @CreateDateColumn()
  @Index()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;
}

