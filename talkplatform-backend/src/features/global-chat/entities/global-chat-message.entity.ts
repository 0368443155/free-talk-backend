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
@Index(['user_id', 'created_at'])
export class GlobalChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Column for user_id to match database schema
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  user_id: string | null;

  // Relation to User (loaded separately when needed via relations)
  // Note: We use a virtual property that will be populated when relation is loaded
  sender: User | null;

  // Getter for sender_id to maintain code compatibility
  get sender_id(): string | null {
    return this.user_id;
  }

  @Column({ type: 'text' })
  message: string;

  // Note: 'type' and 'metadata' columns don't exist in old database schema
  // These are virtual properties for code compatibility
  type?: GlobalMessageType;
  metadata?: any;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'lobby' })
  room_type: string; // Match old schema

  @Column({ type: 'boolean', nullable: true, default: false })
  is_system_message: boolean; // Match old schema

  @Column({ type: 'boolean', nullable: true, default: false })
  is_deleted: boolean; // Match old schema

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date; // Match old schema

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

