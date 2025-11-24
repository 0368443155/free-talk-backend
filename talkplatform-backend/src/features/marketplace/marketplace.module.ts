import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { MaterialCategory } from './entities/material-category.entity';
import { MaterialPurchase } from './entities/material-purchase.entity';
import { MaterialReview } from './entities/material-review.entity';
import { MaterialService } from './services/material.service';
import { StudentMaterialController } from './controllers/student-material.controller';
import { TeacherMaterialController } from './controllers/teacher-material.controller';
import { AdminMaterialController } from './controllers/admin-material.controller';
import { UploadService } from './services/upload.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Material,
            MaterialCategory,
            MaterialPurchase,
            MaterialReview,
        ]),
        WalletModule,
    ],
    controllers: [
        StudentMaterialController,
        TeacherMaterialController,
        AdminMaterialController,
    ],
    providers: [MaterialService, UploadService],
    exports: [MaterialService, UploadService],
})
export class MarketplaceModule { }
