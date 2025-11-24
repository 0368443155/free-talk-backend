import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { TeacherVerificationService } from './teacher-verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@Controller('teachers/verification')
@UseGuards(JwtAuthGuard)
export class TeacherVerificationController {
  constructor(
    private readonly verificationService: TeacherVerificationService,
  ) {}

  /**
   * Upload file cho verification (ảnh hoặc PDF)
   * POST /api/v1/teachers/verification/upload
   * 
   * type: 'identity_front' | 'identity_back' | 'degree' | 'teaching' | 'cv'
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Request() req,
  ) {
    return await this.verificationService.uploadFile(req.user.id, file, type);
  }

  /**
   * Upload multiple files (cho certificates)
   * POST /api/v1/teachers/verification/upload-multiple
   */
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('type') type: string,
    @Request() req,
  ) {
    return await this.verificationService.uploadMultipleFiles(req.user.id, files, type);
  }

  /**
   * Nộp hồ sơ xác minh
   * POST /api/v1/teachers/verification/submit
   */
  @Post('submit')
  async submitVerification(@Body() dto: SubmitVerificationDto, @Request() req) {
    return await this.verificationService.submitVerification(req.user.id, dto);
  }

  /**
   * Lấy trạng thái verification
   * GET /api/v1/teachers/verification/status
   * 
   * NOTE: Route này phải được đặt TRƯỚC route có parameter (:id) để tránh conflict
   */
  @Get('status')
  async getVerificationStatus(@Request() req) {
    try {
      const verification = await this.verificationService.getVerificationStatus(req.user.id);
      
      // Nếu chưa có verification, trả về null (frontend sẽ hiển thị form trống)
      if (!verification) {
        return null;
      }
      
      return verification;
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }

  /**
   * Admin: Lấy document để xem
   * GET /api/v1/teachers/verification/:id/document/:documentType?index=0
   * 
   * documentType: identity_card_front, identity_card_back, degree_certificate, teaching_certificate, cv
   * index: chỉ dùng cho degree_certificate và teaching_certificate (optional)
   * 
   * NOTE: Route này phải được đặt TRƯỚC các route PATCH có :id để tránh conflict
   */
  @Get(':id/document/:documentType')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDocumentUrl(
    @Param('id') id: string,
    @Param('documentType') documentType: string,
    @Query('index') index?: string,
  ) {
    // Parse index correctly - handle 0 as valid value
    const parsedIndex = index !== undefined && index !== null && index !== '' 
      ? parseInt(index, 10) 
      : undefined;
    const url = await this.verificationService.getDocumentUrl(id, documentType, parsedIndex);
    return { url, type: documentType };
  }

  /**
   * Admin: Duyệt verification
   * PATCH /api/v1/teachers/verification/:id/approve
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveVerification(
    @Param('id') id: string,
    @Query('notes') notes: string,
    @Request() req,
  ) {
    return await this.verificationService.approveVerification(id, req.user.id, notes);
  }

  /**
   * Admin: Từ chối verification
   * PATCH /api/v1/teachers/verification/:id/reject
   */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectVerification(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return await this.verificationService.rejectVerification(id, req.user.id, reason);
  }

  /**
   * Admin: Yêu cầu bổ sung thông tin
   * PATCH /api/v1/teachers/verification/:id/request-info
   */
  @Patch(':id/request-info')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async requestInfo(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req,
  ) {
    return await this.verificationService.requestInfo(id, req.user.id, notes);
  }
}


