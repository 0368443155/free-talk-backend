import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../../users/user.entity';

export enum RecordingStatus {
  STARTING = 'starting',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RecordingQuality {
  LOW = 'low', // 480p
  MEDIUM = 'medium', // 720p
  HIGH = 'high', // 1080p
}

@Entity('recordings')
@Index(['roomId'])
@Index(['initiatedById'])
@Index(['status'])
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  roomId: string;

  @Column({ type: 'varchar', length: 50 })
  roomType: string;

  @ManyToOne(() => User)
  @Column({ type: 'varchar', length: 36 })
  initiatedById: string;

  @ManyToOne(() => User, { nullable: true })
  initiatedBy?: User;

  // LiveKit Egress Info
  @Column({ type: 'varchar', length: 255, nullable: true })
  egressId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  livekitRoomName: string;

  // Recording Details
  @Column({
    type: 'enum',
    enum: RecordingStatus,
    default: RecordingStatus.STARTING,
  })
  status: RecordingStatus;

  @Column({
    type: 'enum',
    enum: RecordingQuality,
    default: RecordingQuality.MEDIUM,
  })
  quality: RecordingQuality;

  // File Info
  @Column({ type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  // Duration
  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata: {
    participants?: string[];
    chatMessages?: number;
    features?: string[];
    [key: string]: any;
  };

  // Processing
  @Column({ type: 'json', nullable: true })
  processingInfo: {
    transcriptionId?: string;
    thumbnailsGenerated?: boolean;
    chaptersGenerated?: boolean;
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

