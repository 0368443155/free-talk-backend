import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('bandwidth_metrics')
@Index(["timestamp"]) // Chỉ index trên cột sẽ được truy vấn theo phạm vi (range query)
export class BandwidthMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int' })
  responseTimeMs: number;

  @Column({ type: 'bigint' })
  inboundBytes: number;

  @Column({ type: 'bigint' })
  outboundBytes: number;

  @Column({ type: 'int' })
  activeConnections: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'int', nullable: true })
  userId: number; // Lưu ý: Đây là một cột 'int' đơn giản

  // CỐ TÌNH BỎ QUA: @ManyToOne(() => User)
  // Việc thêm quan hệ @ManyToOne sẽ tạo ra khóa ngoại.
}