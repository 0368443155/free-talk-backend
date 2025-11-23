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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { TeacherVerificationService } from './teacher-verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';

@Controller('api/v1/teachers/verification')
@UseGuards(JwtAuthGuard)
export class TeacherVerificationController {
  constructor(
    private readonly verificationService: TeacherVerificationService,
  ) {}

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
   */
  @Get('status')
  async getVerificationStatus(@Request() req) {
    return await this.verificationService.getVerificationStatus(req.user.id);
  }

  /**
   * Admin: Duyệt verification
   * PATCH /api/v1/teachers/verification/:id/approve
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
  async requestInfo(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req,
  ) {
    return await this.verificationService.requestInfo(id, req.user.id, notes);
  }

  /**
   * Admin: Lấy document URL
   * GET /api/v1/teachers/verification/:id/document/:documentKey
   */
  @Get(':id/document/:documentKey')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getDocumentUrl(
    @Param('id') id: string,
    @Param('documentKey') documentKey: string,
  ) {
    const url = await this.verificationService.getDocumentUrl(id, documentKey);
    return { url };
  }
}


