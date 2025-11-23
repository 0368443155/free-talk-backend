import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';

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
   * Documents lưu trữ trong JSONB để linh hoạt
   * 
   * Cấu trúc:
   * {
   *   identity_card_front: string, // R2 Key hoặc URL
   *   identity_card_back: string,
   *   degree_certificates: Array<{ name: string, key: string, year: number }>,
   *   teaching_certificates: Array<{ name: string, issuer: string, key: string, year: number }>,
   *   cv_url: string,
   *   background_check: string, // Nếu có
   * }
   */
  @Column({ type: 'json', nullable: true })
  documents: {
    identity_card_front?: string;
    identity_card_back?: string;
    degree_certificates?: Array<{
      name: string;
      key: string;
      year: number;
    }>;
    teaching_certificates?: Array<{
      name: string;
      issuer: string;
      key: string;
      year: number;
    }>;
    cv_url?: string;
    background_check?: string;
  };

  /**
   * Thông tin bổ sung từ giáo viên
   */
  @Column({ type: 'json', nullable: true })
  additional_info: {
    years_of_experience?: number;
    previous_platforms?: string[];
    references?: Array<{
      name: string;
      email: string;
      relationship: string;
    }>;
  };

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


