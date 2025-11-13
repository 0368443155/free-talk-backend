import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { ClassroomMember } from './classroom-member.entity';

@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_image: string;

  @Column({ type: 'json', nullable: true })
  settings: any;

  @OneToMany(() => ClassroomMember, (member) => member.classroom, {
    cascade: true,
  })
  members: ClassroomMember[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

