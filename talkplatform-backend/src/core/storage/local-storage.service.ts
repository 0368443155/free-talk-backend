import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
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
  private readonly maxFileSize: number; // bytes
  private readonly allowedMimeTypes: Set<string>;

  constructor(private configService: ConfigService) {
    // Đường dẫn thư mục upload (tương đối project root)
    this.uploadDir = path.join(
      process.cwd(),
      this.configService.get<string>('STORAGE_LOCAL_DIR', 'uploads'),
    );

    // Base URL để tạo public URL
    // Default: http://localhost:3000 (backend port)
    this.baseUrl =
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('STORAGE_LOCAL_BASE_URL') ||
      'http://localhost:3000';

    // Max file size (default: 100MB)
    this.maxFileSize =
      this.configService.get<number>('STORAGE_MAX_FILE_SIZE', 100 * 1024 * 1024);

    // Allowed MIME types
    const allowedTypes = this.configService.get<string>(
      'STORAGE_ALLOWED_TYPES',
      'image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    this.allowedMimeTypes = new Set(allowedTypes.split(',').map((t) => t.trim()));

    // Đảm bảo thư mục tồn tại
    this.ensureDirectoryExists(this.uploadDir);

    this.logger.log(
      `✅ Local Storage initialized: ${this.uploadDir} (Max size: ${this.maxFileSize / 1024 / 1024}MB)`,
    );
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    // Validate file size
    if (buffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Validate MIME type
    if (this.allowedMimeTypes.size > 0 && !this.allowedMimeTypes.has(mimeType)) {
      throw new BadRequestException(
        `File type ${mimeType} is not allowed. Allowed types: ${Array.from(this.allowedMimeTypes).join(', ')}`,
      );
    }

    // Validate và sanitize key
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = this.getFilePath(sanitizedKey);
    const dir = path.dirname(filePath);

    // Kiểm tra path traversal
    if (!filePath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path');
    }

    // Tạo thư mục nếu chưa có
    await this.ensureDirectoryExists(dir);

    // Ghi file
    await fs.writeFile(filePath, buffer);

    this.logger.log(`✅ File uploaded: ${sanitizedKey} (${buffer.length} bytes, ${mimeType})`);

    // Trả về public URL
    return this.getPublicUrl(sanitizedKey);
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    // Local storage: trả về endpoint POST để upload trực tiếp
    // Frontend sẽ dùng POST method với FormData
    const uploadEndpoint = `${this.baseUrl}/api/v1/storage/upload`;
    return `${uploadEndpoint}?key=${encodeURIComponent(key)}&mimeType=${encodeURIComponent(mimeType)}`;
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
   * Sanitize key để tránh path traversal và các ký tự không hợp lệ
   */
  private sanitizeKey(key: string): string {
    // Loại bỏ path traversal attempts
    let sanitized = key.replace(/\.\./g, '').replace(/^\//, '');

    // Loại bỏ các ký tự không hợp lệ
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Giới hạn độ dài
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }

    return sanitized;
  }

  /**
   * Lấy đường dẫn file vật lý từ key
   */
  private getFilePath(key: string): string {
    const sanitizedKey = this.sanitizeKey(key);
    const fullPath = path.join(this.uploadDir, sanitizedKey);

    // Kiểm tra lại để đảm bảo không có path traversal
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(this.uploadDir);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new BadRequestException('Invalid file path: path traversal detected');
    }

    return resolvedPath;
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
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',

      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.rtf': 'application/rtf',

      // Videos
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',

      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',

      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Lấy thống kê storage
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    directory: string;
  }> {
    let totalFiles = 0;
    let totalSize = 0;

    const countFiles = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await countFiles(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            totalFiles++;
            totalSize += stats.size;
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          this.logger.error(`Error counting files in ${dir}:`, error);
        }
      }
    };

    await countFiles(this.uploadDir);

    return {
      totalFiles,
      totalSize,
      directory: this.uploadDir,
    };
  }

  /**
   * Xóa các file cũ hơn một số ngày
   */
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    const deleteOldFiles = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await deleteOldFiles(fullPath);
            // Xóa thư mục rỗng
            try {
              const dirEntries = await fs.readdir(fullPath);
              if (dirEntries.length === 0) {
                await fs.rmdir(fullPath);
              }
            } catch {
              // Ignore errors
            }
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            if (stats.mtime < cutoffDate) {
              await fs.unlink(fullPath);
              deletedCount++;
              this.logger.debug(`Deleted old file: ${fullPath}`);
            }
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          this.logger.error(`Error cleaning up files in ${dir}:`, error);
        }
      }
    };

    await deleteOldFiles(this.uploadDir);

    this.logger.log(`✅ Cleanup completed: ${deletedCount} files deleted`);

    return deletedCount;
  }
}


