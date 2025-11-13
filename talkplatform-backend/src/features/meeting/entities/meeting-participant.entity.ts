import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { User } from '../../../users/user.entity';

export enum ParticipantRole {
  HOST = 'host',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
}

@Entity('meeting_participants')
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
  })
  role: ParticipantRole;

  @Column({ type: 'boolean', default: false })
  is_muted: boolean;

  @Column({ type: 'boolean', default: false })
  is_video_off: boolean;

  @Column({ type: 'boolean', default: false })
  is_screen_sharing: boolean;

  @Column({ type: 'boolean', default: false })
  is_hand_raised: boolean;

  @Column({ type: 'boolean', default: false })
  is_kicked: boolean;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  @Column({ type: 'timestamp' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

