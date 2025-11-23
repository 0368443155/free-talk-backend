import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage.interface';
import { IStorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { CloudStorageService } from './cloud-storage.service';

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
  controllers: [require('./storage.controller').StorageController],
  providers: [
    {
      provide: 'IStorageService',
      useFactory: (configService: ConfigService): IStorageService => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 'local') as StorageProvider;

        switch (provider) {
          case StorageProvider.CLOUDFLARE_R2:
          case StorageProvider.AWS_S3:
            return new CloudStorageService(configService);

          case StorageProvider.LOCAL:
          default:
            return new LocalStorageService(configService);
        }
      },
      inject: [ConfigService],
    },
    // Export cả 2 services để có thể inject trực tiếp nếu cần
    LocalStorageService,
    CloudStorageService,
  ],
  exports: ['IStorageService', LocalStorageService, CloudStorageService],
})
export class StorageModule {}

