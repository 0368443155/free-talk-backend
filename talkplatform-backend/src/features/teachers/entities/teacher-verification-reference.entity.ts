import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TeacherVerification } from './teacher-verification.entity';

/**
 * Reference Entity
 * Lưu trữ thông tin người tham chiếu
 */
@Entity('teacher_verification_references')
@Index(['verification_id'])
export class TeacherVerificationReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeacherVerification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'verification_id' })
  verification: TeacherVerification;

  @Column({ type: 'uuid' })
  verification_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  relationship: string; // 'colleague', 'supervisor', 'student', etc.

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;
}

