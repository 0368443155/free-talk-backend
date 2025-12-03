import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { User } from '../../../users/user.entity';

@Entity('meeting_participants')
@Index(['meeting_id', 'user_id'], { unique: true })
@Index(['meeting_id'])
@Index(['user_id'])
@Index(['duration_seconds'])
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  meeting_id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'char', length: 36 })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0 })
  duration_seconds: number;

  @Column({ type: 'timestamp' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  connection_quality: string;

  @CreateDateColumn()
  created_at: Date;
}
