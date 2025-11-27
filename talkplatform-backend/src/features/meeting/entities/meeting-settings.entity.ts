import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';

@Entity('meeting_settings')
export class MeetingSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  meeting_id: string;

  @Column({ type: 'boolean', default: true })
  allow_screen_share: boolean;

  @Column({ type: 'boolean', default: true })
  allow_chat: boolean;

  @Column({ type: 'boolean', default: true })
  allow_reactions: boolean;

  @Column({ type: 'boolean', default: false })
  record_meeting: boolean;

  @Column({ type: 'boolean', default: false })
  waiting_room: boolean;

  @Column({ type: 'boolean', default: false })
  auto_record: boolean;

  @Column({ type: 'boolean', default: false })
  mute_on_join: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations
  @OneToOne(() => Meeting, (meeting) => meeting.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;
}

