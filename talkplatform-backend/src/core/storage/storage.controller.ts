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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IStorageService } from './storage.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * Storage Controller
 * 
 * Endpoints để upload/download files
 * Hỗ trợ cả direct upload và pre-signed URLs
 */
@Controller('api/v1/storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Upload file trực tiếp lên server
   * POST /api/v1/storage/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('key') key?: string,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Generate key nếu không có
    const fileKey = key || this.generateKey(file.originalname, folder);

    // Upload file
    const url = await this.storageService.uploadFile(
      fileKey,
      file.buffer,
      file.mimetype,
      {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    );

    return {
      success: true,
      key: fileKey,
      url,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Tạo pre-signed URL để upload từ client
   * GET /api/v1/storage/presigned-upload?key=...&mimeType=...
   */
  @Get('presigned-upload')
  async getPresignedUploadUrl(
    @Query('key') key: string,
    @Query('mimeType') mimeType: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    if (!key || !mimeType) {
      throw new BadRequestException('key and mimeType are required');
    }

    const expires = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.storageService.getPresignedUploadUrl(key, mimeType, expires);

    return {
      success: true,
      url,
      key,
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
   * Generate unique key cho file
   */
  private generateKey(originalName: string, folder?: string): string {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    return folder ? `${folder}/${filename}` : filename;
  }
}


