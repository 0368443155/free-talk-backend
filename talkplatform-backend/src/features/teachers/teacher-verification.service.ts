import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherVerification, VerificationStatus } from './entities/teacher-verification.entity';
import { TeacherProfile, TeacherStatus } from './entities/teacher-profile.entity';
import { User, UserRole } from '../../users/user.entity';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { Inject } from '@nestjs/common';
import type { IStorageService } from '../../core/storage/storage.interface';

/**
 * Teacher Verification Service (KYC)
 * 
 * Xử lý quy trình xác minh danh tính giáo viên
 */
@Injectable()
export class TeacherVerificationService {
  private readonly logger = new Logger(TeacherVerificationService.name);

  constructor(
    @InjectRepository(TeacherVerification)
    private readonly verificationRepository: Repository<TeacherVerification>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Nộp hồ sơ xác minh
   */
  async submitVerification(userId: string, dto: SubmitVerificationDto): Promise<TeacherVerification> {
    // Kiểm tra user có phải teacher không
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra đã có verification chưa
    let verification = await this.verificationRepository.findOne({
      where: { user_id: userId },
    });

    if (verification && verification.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('You are already verified');
    }

    // Tạo hoặc cập nhật verification
    if (!verification) {
      verification = this.verificationRepository.create({
        user_id: userId,
        status: VerificationStatus.PENDING,
        documents: {},
        additional_info: {},
      });
    }

    // Cập nhật documents
    verification.documents = {
      identity_card_front: dto.identity_card_front,
      identity_card_back: dto.identity_card_back,
      degree_certificates: dto.degree_certificates?.map((d) => ({
        name: d.name,
        key: d.key,
        year: d.year || new Date().getFullYear(),
      })) || [],
      teaching_certificates: dto.teaching_certificates?.map((d) => ({
        name: d.name,
        issuer: d.issuer || 'Unknown',
        key: d.key,
        year: d.year || new Date().getFullYear(),
      })) || [],
      cv_url: dto.cv_url,
    };

    // Cập nhật additional info
    verification.additional_info = {
      years_of_experience: dto.years_of_experience,
      previous_platforms: dto.previous_platforms || [],
      references: dto.references || [],
    };

    verification.status = VerificationStatus.PENDING;
    verification.last_submitted_at = new Date();
    verification.resubmission_count += 1;

    const saved = await this.verificationRepository.save(verification);

    this.logger.log(`✅ Verification submitted: ${saved.id} for user ${userId}`);

    return saved;
  }

  /**
   * Lấy trạng thái verification
   */
  async getVerificationStatus(userId: string): Promise<TeacherVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { user_id: userId },
    });

    if (!verification) {
      // Tạo mới nếu chưa có
      return this.verificationRepository.create({
        user_id: userId,
        status: VerificationStatus.PENDING,
        documents: {},
        additional_info: {},
      });
    }

    return verification;
  }

  /**
   * Admin: Duyệt verification
   */
  async approveVerification(
    verificationId: string,
    adminId: string,
    notes?: string,
  ): Promise<TeacherVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['user'],
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status === VerificationStatus.APPROVED) {
      throw new BadRequestException('Verification already approved');
    }

    // Cập nhật status
    verification.status = VerificationStatus.APPROVED;
    verification.verified_at = new Date();
    verification.reviewed_by = adminId;
    if (notes) {
      verification.admin_notes = notes;
    }

    await this.verificationRepository.save(verification);

    // Cập nhật TeacherProfile
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: verification.user_id },
    });

    if (profile) {
      profile.is_verified = true;
      profile.status = TeacherStatus.APPROVED;
      await this.teacherProfileRepository.save(profile);
    }

    // Nâng cấp role của user (nếu cần)
    const user = await this.userRepository.findOne({
      where: { id: verification.user_id },
    });

    if (user && user.role !== UserRole.TEACHER) {
      user.role = UserRole.TEACHER;
      await this.userRepository.save(user);
    }

    this.logger.log(`✅ Verification approved: ${verificationId} by admin ${adminId}`);

    return verification;
  }

  /**
   * Admin: Từ chối verification
   */
  async rejectVerification(
    verificationId: string,
    adminId: string,
    reason: string,
  ): Promise<TeacherVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    verification.status = VerificationStatus.REJECTED;
    verification.reviewed_by = adminId;
    verification.rejection_reason = reason;
    verification.admin_notes = reason;

    await this.verificationRepository.save(verification);

    this.logger.log(`❌ Verification rejected: ${verificationId} by admin ${adminId}`);

    return verification;
  }

  /**
   * Admin: Yêu cầu bổ sung thông tin
   */
  async requestInfo(
    verificationId: string,
    adminId: string,
    notes: string,
  ): Promise<TeacherVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    verification.status = VerificationStatus.INFO_NEEDED;
    verification.reviewed_by = adminId;
    verification.admin_notes = notes;

    await this.verificationRepository.save(verification);

    return verification;
  }

  /**
   * Lấy pre-signed URL để xem document (chỉ admin)
   */
  async getDocumentUrl(verificationId: string, documentKey: string): Promise<string> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    // Tìm document key trong documents
    const allKeys = [
      verification.documents?.identity_card_front,
      verification.documents?.identity_card_back,
      verification.documents?.cv_url,
      ...(verification.documents?.degree_certificates?.map((d) => d.key) || []),
      ...(verification.documents?.teaching_certificates?.map((d) => d.key) || []),
    ];

    if (!allKeys.includes(documentKey)) {
      throw new NotFoundException('Document not found');
    }

    // Tạo pre-signed URL (expires in 1 hour)
    return await this.storageService.getPresignedDownloadUrl(documentKey, 3600);
  }
}


