import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Inject,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { IStorageService } from './storage.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

/**
 * Storage Controller
 * 
 * Endpoints để upload/download files
 * Hỗ trợ cả direct upload và pre-signed URLs
 */
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  private localStorageService?: LocalStorageService;

  constructor(
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {
    // Get LocalStorageService instance if available
    if (this.storageService instanceof LocalStorageService) {
      this.localStorageService = this.storageService as LocalStorageService;
    }
  }

  /**
   * Upload file trực tiếp lên server
   * POST /api/v1/storage/upload
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('key') key?: string,
    @Query('folder') folder?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (100MB default)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Validate file type (basic check)
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.mp4',
      '.webm',
      '.mp3',
      '.wav',
      '.doc',
      '.docx',
      '.ppt',
      '.pptx',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
      );
    }

    // Generate key nếu không có, hoặc dùng key từ query param
    const fileKey = key || this.generateKey(file.originalname, folder);
    
    // Nếu có folder trong query và key không có, prepend vào key
    const finalKey = folder && !key ? `${folder}/${fileKey}` : fileKey;

    // Upload file
    const url = await this.storageService.uploadFile(
      finalKey,
      file.buffer,
      file.mimetype,
      {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req?.user?.id,
      },
    );

    this.logger.log(`File uploaded: ${finalKey} by user ${req?.user?.id || 'anonymous'}`);

    return {
      success: true,
      key: finalKey,
      url,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Tạo pre-signed URL để upload từ client
   * GET /api/v1/storage/presigned-upload?key=...&mimeType=...&folder=...
   */
  @Get('presigned-upload')
  @UseGuards(JwtAuthGuard)
  async getPresignedUploadUrl(
    @Query('key') key: string,
    @Query('mimeType') mimeType: string,
    @Query('folder') folder?: string,
    @Query('expiresIn') expiresIn?: string,
    @Request() req?: any,
  ) {
    if (!key || !mimeType) {
      throw new BadRequestException('key and mimeType are required');
    }

    // Nếu có folder, prepend vào key
    const finalKey = folder ? `${folder}/${key}` : key;

    const expires = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.storageService.getPresignedUploadUrl(finalKey, mimeType, expires);

    this.logger.log(`Presigned upload URL generated for key: ${finalKey} by user ${req?.user?.id || 'anonymous'}`);

    return {
      success: true,
      url,
      key: finalKey,
      expiresIn: expires,
    };
  }

  /**
   * Tạo pre-signed URL để download file private
   * GET /api/v1/storage/presigned-download?key=...
   */
  @Get('presigned-download')
  async getPresignedDownloadUrl(
    @Query('key') key: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    if (!key) {
      throw new BadRequestException('key is required');
    }

    const expires = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.storageService.getPresignedDownloadUrl(key, expires);

    return {
      success: true,
      url,
      key,
      expiresIn: expires,
    };
  }

  /**
   * Xóa file
   * DELETE /api/v1/storage/:key
   */
  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    await this.storageService.deleteFile(key);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  /**
   * Lấy metadata của file
   * GET /api/v1/storage/:key/metadata
   */
  @Get(':key/metadata')
  async getFileMetadata(@Param('key') key: string) {
    const metadata = await this.storageService.getFileMetadata(key);

    return {
      success: true,
      metadata,
    };
  }

  /**
   * Lấy thống kê storage (chỉ cho Local Storage)
   * GET /api/v1/storage/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStorageStats() {
    if (!this.localStorageService) {
      throw new BadRequestException('Storage stats only available for local storage');
    }

    const stats = await this.localStorageService.getStorageStats();

    return {
      success: true,
      stats: {
        ...stats,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        totalSizeGB: (stats.totalSize / 1024 / 1024 / 1024).toFixed(2),
      },
    };
  }

  /**
   * Cleanup old files (chỉ cho Local Storage)
   * POST /api/v1/storage/cleanup?days=30
   */
  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  async cleanupOldFiles(@Query('days') days?: string) {
    if (!this.localStorageService) {
      throw new BadRequestException('Cleanup only available for local storage');
    }

    const daysOld = days ? parseInt(days, 10) : 30;
    const deletedCount = await this.localStorageService.cleanupOldFiles(daysOld);

    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} files older than ${daysOld} days`,
    };
  }

  /**
   * Generate unique key cho file
   */
  private generateKey(originalName: string, folder?: string): string {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;

    // Tạo cấu trúc thư mục theo ngày để dễ quản lý
    const date = new Date();
    const dateFolder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

    if (folder) {
      return `${folder}/${dateFolder}/${filename}`;
    }

    return `${dateFolder}/${filename}`;
  }
}


