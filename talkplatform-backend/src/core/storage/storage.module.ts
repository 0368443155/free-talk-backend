import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage.interface';
import { IStorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { CloudStorageService } from './cloud-storage.service';
import { StorageController } from './storage.controller';

/**
 * Storage Module
 * 
 * Cung cấp Storage Service dựa trên cấu hình STORAGE_PROVIDER
 * - local: Lưu trữ trên server (cho MVP)
 * - r2: Cloudflare R2 (tiết kiệm chi phí)
 * - s3: AWS S3 (production)
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: 'IStorageService',
      useFactory: (configService: ConfigService): IStorageService => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local') as StorageProvider;

        switch (provider) {
          case StorageProvider.CLOUDFLARE_R2:
          case StorageProvider.AWS_S3:
            // Chỉ khởi tạo CloudStorageService khi thực sự cần
            try {
              return new CloudStorageService(configService);
            } catch (error) {
              console.warn('Failed to initialize CloudStorageService, falling back to LocalStorage:', error.message);
              return new LocalStorageService(configService);
            }

          case StorageProvider.LOCAL:
          default:
            return new LocalStorageService(configService);
        }
      },
      inject: [ConfigService],
    },
    // Export LocalStorageService (luôn available)
    LocalStorageService,
    // CloudStorageService - chỉ khởi tạo khi cần (optional)
    {
      provide: CloudStorageService,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local') as StorageProvider;
        if (provider === StorageProvider.CLOUDFLARE_R2 || provider === StorageProvider.AWS_S3) {
          try {
            return new CloudStorageService(configService);
          } catch (error) {
            // Nếu không có config, trả về null thay vì throw error
            console.warn('CloudStorageService not initialized:', error.message);
            return null;
          }
        }
        return null; // Không khởi tạo nếu không cần
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IStorageService', LocalStorageService, CloudStorageService],
})
export class StorageModule {}

