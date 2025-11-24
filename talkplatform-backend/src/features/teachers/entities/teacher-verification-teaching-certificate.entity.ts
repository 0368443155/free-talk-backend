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
 * Teaching Certificate Entity
 * Lưu trữ các chứng chỉ giảng dạy (TEFL, TESOL, etc.)
 */
@Entity('teacher_verification_teaching_certificates')
@Index(['verification_id'])
export class TeacherVerificationTeachingCertificate {
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
  issuer: string;

  @Column({ type: 'varchar', length: 500 })
  file_url: string; // URL to image file

  @Column({ type: 'int' })
  year: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;
}

