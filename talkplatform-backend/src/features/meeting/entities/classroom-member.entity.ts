import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { User } from '../../../users/user.entity';

@Entity('classroom_members')
export class ClassroomMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Classroom, (classroom) => classroom.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ['student', 'assistant'], default: 'student' })
  role: string;

  @Column({ type: 'timestamp' })
  joined_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
