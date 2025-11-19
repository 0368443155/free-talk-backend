import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('metrics_hourly')
@Index(["timestamp"]) // Index cho truy vấn theo thời gian
@Index(["endpoint"]) // Index cho truy vấn theo endpoint
export class MetricsHourly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpoint: string;

  @Column({ type: 'double' })
  avgResponseTime: number;

  @Column({ type: 'bigint' })
  totalInboundBytes: number;

  @Column({ type: 'bigint' })
  totalOutboundBytes: number;

  @Column({ type: 'int' })
  requestCount: number;

  @Column({ type: 'int' })
  maxActiveConnections: number;

  @Column({ type: 'double' })
  avgBandwidthUsage: number; // bytes per second average

  @Column({ type: 'timestamp' })
  timestamp: Date;
}