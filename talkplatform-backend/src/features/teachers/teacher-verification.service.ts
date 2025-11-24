import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherVerification, VerificationStatus } from './entities/teacher-verification.entity';
import { TeacherVerificationDegreeCertificate } from './entities/teacher-verification-degree-certificate.entity';
import { TeacherVerificationTeachingCertificate } from './entities/teacher-verification-teaching-certificate.entity';
import { TeacherVerificationReference } from './entities/teacher-verification-reference.entity';
import { TeacherProfile, TeacherStatus } from './entities/teacher-profile.entity';
import { User, UserRole } from '../../users/user.entity';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { Inject } from '@nestjs/common';
import type { IStorageService } from '../../core/storage/storage.interface';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * Teacher Verification Service (KYC)
 * 
 * Xử lý quy trình xác minh danh tính giáo viên
 */
@Injectable()
export class TeacherVerificationService {
  private readonly logger = new Logger(TeacherVerificationService.name);

  private readonly uploadBaseDir: string;
  private readonly imageUploadDir: string;
  private readonly documentUploadDir: string;

  constructor(
    @InjectRepository(TeacherVerification)
    private readonly verificationRepository: Repository<TeacherVerification>,
    @InjectRepository(TeacherVerificationDegreeCertificate)
    private readonly degreeCertRepository: Repository<TeacherVerificationDegreeCertificate>,
    @InjectRepository(TeacherVerificationTeachingCertificate)
    private readonly teachingCertRepository: Repository<TeacherVerificationTeachingCertificate>,
    @InjectRepository(TeacherVerificationReference)
    private readonly referenceRepository: Repository<TeacherVerificationReference>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {
    // Tạo thư mục uploads/teacher-verification nếu chưa có
    this.uploadBaseDir = path.join(process.cwd(), 'uploads', 'teacher-verification');
    this.imageUploadDir = path.join(this.uploadBaseDir, 'image');
    this.documentUploadDir = path.join(this.uploadBaseDir, 'document');
    
    // Tạo thư mục ngay lập tức (sync) để đảm bảo tồn tại khi service được khởi tạo
    this.ensureDirectoryExistsSync(this.uploadBaseDir);
    this.ensureDirectoryExistsSync(this.imageUploadDir);
    this.ensureDirectoryExistsSync(this.documentUploadDir);
  }

  private ensureDirectoryExistsSync(dirPath: string): void {
    try {
      fsSync.accessSync(dirPath);
    } catch {
      fsSync.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`✅ Created directory: ${dirPath}`);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.log(`✅ Created directory: ${dirPath}`);
    }
  }

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

    // Cập nhật các cột riêng biệt (lưu URLs thay vì base64)
    verification.identity_card_front = dto.identity_card_front; // URL
    verification.identity_card_back = dto.identity_card_back; // URL
    verification.cv_url = dto.cv_url || null; // URL (có thể undefined)
    verification.years_of_experience = dto.years_of_experience ?? null; // Có thể undefined
    verification.previous_platforms = dto.previous_platforms || [];

    verification.status = VerificationStatus.PENDING;
    verification.last_submitted_at = new Date();
    // Chỉ increment nếu đã có verification trước đó
    if (verification.resubmission_count === undefined || verification.resubmission_count === null) {
      verification.resubmission_count = 0;
    } else {
      verification.resubmission_count += 1;
    }

    // Lưu verification trước để có ID
    const saved = await this.verificationRepository.save(verification);

    // Xóa các certificates và references cũ (nếu có)
    await this.degreeCertRepository.delete({ verification_id: saved.id });
    await this.teachingCertRepository.delete({ verification_id: saved.id });
    await this.referenceRepository.delete({ verification_id: saved.id });

    // Tạo degree certificates mới
    if (dto.degree_certificates && dto.degree_certificates.length > 0) {
      const degreeCerts = dto.degree_certificates.map((d) =>
        this.degreeCertRepository.create({
          verification_id: saved.id,
          name: d.name,
          file_url: d.file_url, // URL thay vì base64
          year: d.year || new Date().getFullYear(),
        })
      );
      await this.degreeCertRepository.save(degreeCerts);
    }

    // Tạo teaching certificates mới
    if (dto.teaching_certificates && dto.teaching_certificates.length > 0) {
      const teachingCerts = dto.teaching_certificates.map((d) =>
        this.teachingCertRepository.create({
          verification_id: saved.id,
          name: d.name,
          issuer: d.issuer || 'Unknown',
          file_url: d.file_url, // URL thay vì base64
          year: d.year || new Date().getFullYear(),
        })
      );
      await this.teachingCertRepository.save(teachingCerts);
    }

    // Tạo references mới
    if (dto.references && dto.references.length > 0) {
      const refs = dto.references.map((r) =>
        this.referenceRepository.create({
          verification_id: saved.id,
          name: r.name,
          email: r.email,
          relationship: r.relationship,
        })
      );
      await this.referenceRepository.save(refs);
    }

    // Load lại với relations để trả về đầy đủ
    const fullVerification = await this.verificationRepository.findOne({
      where: { id: saved.id },
      relations: ['degree_certificates', 'teaching_certificates', 'references'],
    });

    this.logger.log(`✅ Verification submitted: ${saved.id} for user ${userId}`);

    return fullVerification || saved;
  }

  /**
   * Lấy trạng thái verification
   */
  async getVerificationStatus(userId: string): Promise<TeacherVerification | null> {
    const verification = await this.verificationRepository.findOne({
      where: { user_id: userId },
    });

    // Trả về null nếu chưa có verification (frontend sẽ xử lý)
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
   * Lấy document để xem (chỉ admin)
   * Trả về URL cho ảnh hoặc PDF
   */
  async getDocumentUrl(verificationId: string, documentType: string, documentIndex?: number): Promise<string> {
    // Xử lý theo loại document
    switch (documentType) {
      case 'identity_card_front':
        const verificationFront = await this.verificationRepository.findOne({
          where: { id: verificationId },
          select: ['id', 'identity_card_front'],
        });
        if (!verificationFront || !verificationFront.identity_card_front) {
          throw new NotFoundException('Identity card front not found');
        }
        return verificationFront.identity_card_front;

      case 'identity_card_back':
        const verificationBack = await this.verificationRepository.findOne({
          where: { id: verificationId },
          select: ['id', 'identity_card_back'],
        });
        if (!verificationBack || !verificationBack.identity_card_back) {
          throw new NotFoundException('Identity card back not found');
        }
        return verificationBack.identity_card_back;

      case 'degree_certificate':
        if (documentIndex === undefined) {
          throw new BadRequestException('Document index is required for degree certificate');
        }
        const degreeCerts = await this.degreeCertRepository.find({
          where: { verification_id: verificationId },
          order: { created_at: 'ASC' },
        });
        if (!degreeCerts || degreeCerts.length <= documentIndex) {
          throw new NotFoundException('Degree certificate not found');
        }
        return degreeCerts[documentIndex].file_url;

      case 'teaching_certificate':
        if (documentIndex === undefined) {
          throw new BadRequestException('Document index is required for teaching certificate');
        }
        const teachingCerts = await this.teachingCertRepository.find({
          where: { verification_id: verificationId },
          order: { created_at: 'ASC' },
        });
        if (!teachingCerts || teachingCerts.length <= documentIndex) {
          throw new NotFoundException('Teaching certificate not found');
        }
        return teachingCerts[documentIndex].file_url;

      case 'cv':
        const verificationCv = await this.verificationRepository.findOne({
          where: { id: verificationId },
          select: ['id', 'cv_url'],
        });
        if (!verificationCv || !verificationCv.cv_url) {
          throw new NotFoundException('CV not found');
        }
        return verificationCv.cv_url;

      default:
        throw new BadRequestException(`Invalid document type: ${documentType}`);
    }
  }

  /**
   * Upload file cho verification
   */
  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    type: string,
  ): Promise<{ url: string; filePath: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const allowedDocTypes = ['application/pdf'];

    let uploadDir: string;
    let allowedTypes: string[];

    if (type === 'cv') {
      uploadDir = this.documentUploadDir;
      allowedTypes = allowedDocTypes;
      if (!allowedDocTypes.includes(file.mimetype)) {
        throw new BadRequestException('CV must be a PDF file');
      }
    } else if (['identity_front', 'identity_back', 'degree', 'teaching'].includes(type)) {
      uploadDir = this.imageUploadDir;
      allowedTypes = allowedImageTypes;
      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new BadRequestException('File must be an image (JPEG, PNG, or WebP)');
      }
    } else {
      throw new BadRequestException(`Invalid file type: ${type}`);
    }

    // Validate file size (max 10MB for images, 20MB for PDF)
    const maxSize = type === 'cv' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${type}_${userId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Generate public URL
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const relativePath = `teacher-verification/${type === 'cv' ? 'document' : 'image'}/${filename}`;
    const url = `${baseUrl}/uploads/${relativePath}`;

    this.logger.log(`✅ File uploaded: ${filePath} (${file.size} bytes)`);

    return { url, filePath: relativePath };
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    userId: string,
    files: Express.Multer.File[],
    type: string,
  ): Promise<Array<{ url: string; filePath: string }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Files are required');
    }

    const results = await Promise.all(
      files.map((file) => this.uploadFile(userId, file, type))
    );

    return results;
  }
}


