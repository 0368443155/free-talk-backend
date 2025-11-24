import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';

export enum GlobalMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  REACTION = 'reaction',
}

@Entity('global_chat_messages')
@Index(['created_at'])
@Index(['sender_id', 'created_at'])
export class GlobalChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'uuid', nullable: true })
  sender_id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: GlobalMessageType,
    default: GlobalMessageType.TEXT,
  })
  type: GlobalMessageType;

  @Column({ type: 'json', nullable: true })
  metadata: any; // For reply_to, reactions, etc.

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

