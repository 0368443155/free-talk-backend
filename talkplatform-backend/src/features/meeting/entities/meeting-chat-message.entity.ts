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

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  REACTION = 'reaction',
}

@Entity('meeting_chat_messages')
export class MeetingChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.chat_messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

