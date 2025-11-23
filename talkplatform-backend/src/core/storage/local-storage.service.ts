import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageService } from './storage.interface';

/**
 * Local File System Storage Service
 * 
 * Lưu trữ file trực tiếp trên server
 * Phù hợp cho giai đoạn MVP và development
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Đường dẫn thư mục upload (tương đối project root)
    this.uploadDir = path.join(
      process.cwd(),
      this.configService.get<string>('STORAGE_LOCAL_DIR', 'uploads'),
    );

    // Base URL để tạo public URL
    this.baseUrl =
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('STORAGE_LOCAL_BASE_URL') ||
      'http://localhost:3001';

    // Đảm bảo thư mục tồn tại
    this.ensureDirectoryExists(this.uploadDir);
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);

    // Tạo thư mục nếu chưa có
    await this.ensureDirectoryExists(dir);

    // Ghi file
    await fs.writeFile(filePath, buffer);

    this.logger.log(`✅ File uploaded: ${key} (${buffer.length} bytes)`);

    // Trả về public URL
    return this.getPublicUrl(key);
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    // Local storage không cần pre-signed URL
    // Trả về endpoint upload thông thường
    // Trong thực tế, client sẽ upload trực tiếp lên server
    const uploadEndpoint = `${this.baseUrl}/api/v1/storage/upload`;
    return `${uploadEndpoint}?key=${encodeURIComponent(key)}&expires=${Date.now() + expiresIn * 1000}`;
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Local storage: trả về public URL trực tiếp
    // Trong production, có thể thêm token validation
    return this.getPublicUrl(key);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`✅ File deleted: ${key}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`⚠️ File not found: ${key}`);
        return; // File không tồn tại, không cần throw error
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  }> {
    const filePath = this.getFilePath(key);
    const stats = await fs.stat(filePath);

    // Đoán MIME type từ extension
    const ext = path.extname(key).toLowerCase();
    const contentType = this.getContentTypeFromExtension(ext);

    return {
      size: stats.size,
      contentType,
      lastModified: stats.mtime,
      etag: stats.ino.toString(), // Sử dụng inode làm etag
    };
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = this.getFilePath(sourceKey);
    const destPath = this.getFilePath(destinationKey);
    const destDir = path.dirname(destPath);

    await this.ensureDirectoryExists(destDir);
    await fs.copyFile(sourcePath, destPath);

    this.logger.log(`✅ File copied: ${sourceKey} -> ${destinationKey}`);
  }

  /**
   * Lấy đường dẫn file vật lý từ key
   */
  private getFilePath(key: string): string {
    // Sanitize key để tránh path traversal
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\//, '');
    return path.join(this.uploadDir, sanitizedKey);
  }

  /**
   * Tạo public URL từ key
   */
  private getPublicUrl(key: string): string {
    const sanitizedKey = key.replace(/^\//, '');
    return `${this.baseUrl}/uploads/${sanitizedKey}`;
  }

  /**
   * Đảm bảo thư mục tồn tại
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Đoán MIME type từ extension
   */
  private getContentTypeFromExtension(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}


