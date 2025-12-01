import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { RegenerateQrCodeCommand } from '../commands/regenerate-qr-code.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { QrCodeService } from '../../../../common/services/qr-code.service';

@Injectable()
@CommandHandler(RegenerateQrCodeCommand)
export class RegenerateQrCodeHandler implements ICommandHandler<RegenerateQrCodeCommand> {
  private readonly logger = new Logger(RegenerateQrCodeHandler.name);

  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly qrCodeService: QrCodeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RegenerateQrCodeCommand): Promise<void> {
    this.logger.log(
      `Regenerating QR code for course ${command.courseId} by teacher ${command.teacherId}`,
    );

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('You can only regenerate QR code for your own courses');
    }

    // Generate share link and QR code
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const shareLink = `${frontendUrl}/courses/${command.courseId}`;

    try {
      const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(shareLink);

      // Update course
      const course = courseAggregate.entity;
      course.share_link = shareLink;
      course.qr_code_url = qrCodeDataUrl;
      await this.courseRepository.save(courseAggregate);

      this.logger.log(`QR code regenerated for course: ${command.courseId}`);
    } catch (error) {
      this.logger.error(`Failed to regenerate QR code: ${error.message}`);
      throw new BadRequestException('Failed to regenerate QR code');
    }
  }
}


