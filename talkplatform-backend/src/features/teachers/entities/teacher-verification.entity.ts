import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { TeacherVerificationDegreeCertificate } from './teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './teacher-verification-reference.entity';

/**
 * Verification Status
 */
export enum VerificationStatus {
  PENDING = 'pending', // Đang chờ duyệt
  UNDER_REVIEW = 'under_review', // Đang xem xét
  INFO_NEEDED = 'info_needed', // Cần bổ sung thông tin
  APPROVED = 'approved', // Đã duyệt
  REJECTED = 'rejected', // Từ chối
}

/**
 * Teacher Verification Entity (KYC)
 * 
 * Lưu trữ thông tin xác minh danh tính giáo viên
 * Tuân thủ tiêu chuẩn Identity Foundation
 */
@Entity('teacher_verifications')
@Index(['user_id'])
@Index(['status'])
export class TeacherVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  /**
   * Identity Documents - URLs to image files
   */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'URL to image file in uploads/teacher-verification/image/' })
  identity_card_front: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'URL to image file in uploads/teacher-verification/image/' })
  identity_card_back: string;

  /**
   * CV/Resume - File path in uploads/teacher-verification/document/
   */
  @Column({ type: 'varchar', length: 500, nullable: true, comment: 'File path in uploads/teacher-verification/document/' })
  cv_url: string;

  /**
   * Additional Information
   */
  @Column({ type: 'int', nullable: true, comment: 'Years of teaching experience' })
  years_of_experience: number;

  @Column({ type: 'json', nullable: true, comment: 'Array of previous platform names' })
  previous_platforms: string[];

  /**
   * Relations - Separate tables for better data integrity
   */
  @OneToMany(() => TeacherVerificationDegreeCertificate, (cert) => cert.verification, { cascade: true })
  degree_certificates: TeacherVerificationDegreeCertificate[];

  @OneToMany(() => TeacherVerificationTeachingCertificate, (cert) => cert.verification, { cascade: true })
  teaching_certificates: TeacherVerificationTeachingCertificate[];

  @OneToMany(() => TeacherVerificationReference, (ref) => ref.verification, { cascade: true })
  references: TeacherVerificationReference[];

  /**
   * Legacy JSON columns - kept for backward compatibility during migration
   * Can be removed after all data is migrated
   */
  @Column({ type: 'json', nullable: true })
  documents: any; // Deprecated - use separate columns

  @Column({ type: 'json', nullable: true })
  additional_info: any; // Deprecated - use separate columns

  /**
   * Ghi chú từ admin
   */
  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  /**
   * Lý do từ chối (nếu status = REJECTED)
   */
  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  /**
   * Admin đã duyệt/từ chối
   */
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string;

  /**
   * Thời gian duyệt
   */
  @Column({ type: 'timestamp', nullable: true })
  verified_at: Date;

  /**
   * Số lần nộp lại (nếu bị từ chối)
   */
  @Column({ type: 'int', default: 0 })
  resubmission_count: number;

  /**
   * Thời gian nộp lại gần nhất
   */
  @Column({ type: 'timestamp', nullable: true })
  last_submitted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}


