import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService } from './storage.interface';

/**
 * Cloud Storage Service (Cloudflare R2 / AWS S3)
 * 
 * Sử dụng AWS SDK v3 tương thích với R2 (S3-compatible API)
 * 
 * Cấu hình:
 * - STORAGE_PROVIDER=r2 hoặc s3
 * - STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com (cho R2)
 * - STORAGE_REGION=auto (cho R2) hoặc us-east-1 (cho S3)
 * - STORAGE_BUCKET_NAME=<bucket-name>
 * - STORAGE_ACCESS_KEY_ID=<access-key>
 * - STORAGE_SECRET_ACCESS_KEY=<secret-key>
 * - STORAGE_PUBLIC_URL=https://<bucket-name>.<domain> (cho public files)
 */
@Injectable()
export class CloudStorageService implements IStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl?: string;
  private readonly provider: 'r2' | 's3';

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET_NAME') || '';
    this.publicUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');
    this.provider = (this.configService.get<string>('STORAGE_PROVIDER') || 'r2') as 'r2' | 's3';

    if (!this.bucketName) {
      throw new Error('STORAGE_BUCKET_NAME is required for cloud storage');
    }

    // Cấu hình S3Client
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const region = this.configService.get<string>('STORAGE_REGION') || (this.provider === 'r2' ? 'auto' : 'us-east-1');
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('STORAGE_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY are required for cloud storage');
    }

    const clientConfig: any = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // R2 yêu cầu endpoint rõ ràng
    if (this.provider === 'r2' && endpoint) {
      clientConfig.endpoint = endpoint;
    } else if (this.provider === 's3' && endpoint) {
      // S3 có thể dùng custom endpoint (ví dụ: DigitalOcean Spaces)
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true; // Cho S3-compatible services
    }

    this.s3Client = new S3Client(clientConfig);

    this.logger.log(
      `✅ Cloud Storage initialized: ${this.provider.toUpperCase()} (Bucket: ${this.bucketName})`,
    );
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
      // R2 không hỗ trợ ACL, bỏ qua
      // ACL: 'private', // Sử dụng bucket policy để quản lý quyền
    });

    await this.s3Client.send(command);

    this.logger.log(`✅ File uploaded to cloud: ${key} (${buffer.length} bytes)`);

    // Trả về public URL hoặc key
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.debug(`✅ Pre-signed upload URL generated: ${key} (expires in ${expiresIn}s)`);

    return url;
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.debug(`✅ Pre-signed download URL generated: ${key} (expires in ${expiresIn}s)`);

    return url;
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);

    this.logger.log(`✅ File deleted from cloud: ${key}`);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag?: string;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      etag: response.ETag,
    };
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    });

    await this.s3Client.send(command);

    this.logger.log(`✅ File copied in cloud: ${sourceKey} -> ${destinationKey}`);
  }
}


