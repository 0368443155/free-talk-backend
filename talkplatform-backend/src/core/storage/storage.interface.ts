/**
 * Storage Service Interface
 * 
 * Repository Pattern để trừu tượng hóa lớp lưu trữ
 * Hỗ trợ: Local File System, Cloudflare R2, AWS S3
 * 
 * @see https://developers.cloudflare.com/r2/api/s3/api/
 */
export interface IStorageService {
  /**
   * Upload file lên storage
   * @param key - Đường dẫn file trong bucket (ví dụ: "materials/teacher-123/file.pdf")
   * @param buffer - Buffer chứa dữ liệu file
   * @param mimeType - MIME type của file (ví dụ: "application/pdf")
   * @param metadata - Metadata tùy chọn (ví dụ: { originalName: "document.pdf" })
   * @returns URL công khai hoặc key để truy cập file
   */
  uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string>;

  /**
   * Tạo Pre-signed URL để upload trực tiếp từ client
   * @param key - Đường dẫn file trong bucket
   * @param mimeType - MIME type của file
   * @param expiresIn - Thời gian hết hạn (giây), mặc định 3600 (1 giờ)
   * @returns Pre-signed URL
   */
  getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number,
  ): Promise<string>;

  /**
   * Tạo Pre-signed URL để download file (cho private files)
   * @param key - Đường dẫn file trong bucket
   * @param expiresIn - Thời gian hết hạn (giây), mặc định 3600 (1 giờ)
   * @returns Pre-signed URL
   */
  getPresignedDownloadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<string>;

  /**
   * Xóa file khỏi storage
   * @param key - Đường dẫn file trong bucket
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Kiểm tra file có tồn tại không
   * @param key - Đường dẫn file trong bucket
   * @returns true nếu file tồn tại
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Lấy metadata của file
   * @param key - Đường dẫn file trong bucket
   * @returns Metadata (size, contentType, lastModified, etc.)
   */
  getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  }>;

  /**
   * Copy file từ vị trí này sang vị trí khác
   * @param sourceKey - Đường dẫn file nguồn
   * @param destinationKey - Đường dẫn file đích
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;
}

/**
 * Storage Provider Type
 */
export enum StorageProvider {
  LOCAL = 'local',
  CLOUDFLARE_R2 = 'r2',
  AWS_S3 = 's3',
}


