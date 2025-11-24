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
 * Degree Certificate Entity
 * Lưu trữ các bằng cấp của giáo viên
 */
@Entity('teacher_verification_degree_certificates')
@Index(['verification_id'])
export class TeacherVerificationDegreeCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeacherVerification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'verification_id' })
  verification: TeacherVerification;

  @Column({ type: 'uuid' })
  verification_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  file_url: string; // URL to image file

  @Column({ type: 'int' })
  year: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;
}

