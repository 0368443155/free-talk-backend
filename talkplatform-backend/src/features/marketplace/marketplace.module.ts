import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { MaterialCategory } from './entities/material-category.entity';
import { MaterialPurchase } from './entities/material-purchase.entity';
import { MaterialReview } from './entities/material-review.entity';
import { MaterialService } from './services/material.service';
import { AnalyticsService } from './services/analytics.service';
import { SignedUrlService } from './services/signed-url.service';
import { PdfService } from './services/pdf.service';
import { StudentMaterialController } from './controllers/student-material.controller';
import { TeacherMaterialController } from './controllers/teacher-material.controller';
import { AdminMaterialController } from './controllers/admin-material.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { DownloadController } from './controllers/download.controller';
import { UploadService } from './services/upload.service';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule as InfrastructureCacheModule } from '../../infrastructure/cache/cache.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Material,
            MaterialCategory,
            MaterialPurchase,
            MaterialReview,
        ]),
        WalletModule,
        ConfigModule,
        InfrastructureCacheModule,
    ],
    controllers: [
        StudentMaterialController,
        TeacherMaterialController,
        AdminMaterialController,
        AnalyticsController,
        DownloadController,
    ],
    providers: [MaterialService, UploadService, AnalyticsService, SignedUrlService, PdfService],
    exports: [MaterialService, UploadService, AnalyticsService, SignedUrlService, PdfService],
})
export class MarketplaceModule { }
