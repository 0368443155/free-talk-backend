# HƯỚNG DẪN TRIỂN KHAI MODULE 6: MARKETPLACE

## 📋 TỔNG QUAN

Module Marketplace cho phép giáo viên đăng bán tài liệu học tập (PDF, Video, Slide, Audio) và học viên mua bằng credits.

**Thời gian ước tính:** 1-2 tuần  
**Độ ưu tiên:** 🔴 Critical (Module hoàn toàn thiếu)

---

## 🗂️ CẤU TRÚC THƯ MỤC

```
talkplatform-backend/src/features/marketplace/
├── entities/
│   ├── material.entity.ts
│   ├── material-purchase.entity.ts
│   ├── material-review.entity.ts
│   └── material-category.entity.ts
├── dto/
│   ├── create-material.dto.ts
│   ├── update-material.dto.ts
│   ├── purchase-material.dto.ts
│   ├── create-review.dto.ts
│   └── material-query.dto.ts
├── services/
│   ├── marketplace.service.ts
│   ├── material-upload.service.ts
│   └── material-preview.service.ts
├── controllers/
│   ├── marketplace.controller.ts (Student endpoints)
│   ├── marketplace-teacher.controller.ts (Teacher endpoints)
│   └── marketplace-admin.controller.ts (Admin endpoints)
├── guards/
│   └── material-owner.guard.ts
└── marketplace.module.ts
```

---

## 📝 BƯỚC 1: TẠO DATABASE TABLES

### 1.1. Chạy SQL Script

```bash
# Đã tạo file: database/missing_tables.sql
# Chạy script này vào MySQL database

mysql -u root -p talkconnect < database/missing_tables.sql
```

### 1.2. Verify Tables Created

```sql
SHOW TABLES LIKE 'material%';
-- Should show:
-- material_categories
-- materials
-- material_purchases
-- material_reviews
-- material_review_helpful
```

---

## 📝 BƯỚC 2: TẠO ENTITIES

### 2.1. Material Category Entity

**File:** `src/features/marketplace/entities/material-category.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Material } from './material.entity';

@Entity('material_categories')
export class MaterialCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => MaterialCategory, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: MaterialCategory;

  @OneToMany(() => MaterialCategory, (category) => category.parent)
  children: MaterialCategory[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => Material, (material) => material.category)
  materials: Material[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
```

### 2.2. Material Entity

**File:** `src/features/marketplace/entities/material.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { MaterialCategory } from './material-category.entity';
import { MaterialPurchase } from './material-purchase.entity';
import { MaterialReview } from './material-review.entity';

export enum MaterialType {
  PDF = 'pdf',
  VIDEO = 'video',
  SLIDE = 'slide',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  COURSE = 'course',
  EBOOK = 'ebook',
}

export enum MaterialLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ALL = 'all',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @ManyToOne(() => MaterialCategory, (category) => category.materials)
  @JoinColumn({ name: 'category_id' })
  category: MaterialCategory;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: MaterialType,
  })
  material_type: MaterialType;

  @Column({ type: 'varchar', length: 500 })
  file_url: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  preview_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url: string;

  @Column({ type: 'int', default: 0 })
  price_credits: number;

  @Column({ type: 'int', nullable: true })
  original_price_credits: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string;

  @Column({
    type: 'enum',
    enum: MaterialLevel,
    default: MaterialLevel.ALL,
  })
  level: MaterialLevel;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'int', nullable: true })
  duration: number; // seconds for video/audio

  @Column({ type: 'int', nullable: true })
  page_count: number; // for PDF/documents

  @Column({ type: 'int', default: 0 })
  download_count: number;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  total_reviews: number;

  @Column({ type: 'int', default: 0 })
  total_sales: number;

  @Column({ type: 'int', default: 0 })
  total_revenue: number;

  @Column({ type: 'boolean', default: false })
  is_published: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @OneToMany(() => MaterialPurchase, (purchase) => purchase.material)
  purchases: MaterialPurchase[];

  @OneToMany(() => MaterialReview, (review) => review.material)
  reviews: MaterialReview[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
```

### 2.3. Material Purchase Entity

**File:** `src/features/marketplace/entities/material-purchase.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Material } from './material.entity';
import { CreditTransaction } from '../../credits/entities/credit-transaction.entity';

@Entity('material_purchases')
export class MaterialPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Material, (material) => material.purchases)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  price_paid: number;

  @ManyToOne(() => CreditTransaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction: CreditTransaction;

  @Column({ type: 'int', default: 0 })
  download_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_downloaded_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  purchased_at: Date;
}
```

### 2.4. Material Review Entity

**File:** `src/features/marketplace/entities/material-review.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Material } from './material.entity';

@Entity('material_reviews')
export class MaterialReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Material, (material) => material.reviews)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'boolean', default: false })
  is_verified_purchase: boolean;

  @Column({ type: 'int', default: 0 })
  helpful_count: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
```

---

## 📝 BƯỚC 3: TẠO DTOs

### 3.1. Create Material DTO

**File:** `src/features/marketplace/dto/create-material.dto.ts`

```typescript
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { MaterialType, MaterialLevel } from '../entities/material.entity';

export class CreateMaterialDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsEnum(MaterialType)
  material_type: MaterialType;

  @IsString()
  @IsOptional()
  category_id?: string;

  @IsInt()
  @Min(0)
  price_credits: number;

  @IsString()
  @IsOptional()
  language?: string;

  @IsEnum(MaterialLevel)
  @IsOptional()
  level?: MaterialLevel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsInt()
  @IsOptional()
  page_count?: number;

  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}
```

### 3.2. Update Material DTO

**File:** `src/features/marketplace/dto/update-material.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialDto } from './create-material.dto';

export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
```

### 3.3. Material Query DTO

**File:** `src/features/marketplace/dto/material-query.dto.ts`

```typescript
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialType, MaterialLevel } from '../entities/material.entity';

export class MaterialQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  material_type?: MaterialType;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(MaterialLevel)
  level?: MaterialLevel;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsString()
  sort_by?: 'newest' | 'popular' | 'rating' | 'price_low' | 'price_high' = 'newest';
}
```

### 3.4. Create Review DTO

**File:** `src/features/marketplace/dto/create-review.dto.ts`

```typescript
import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
```

---

## 📝 BƯỚC 4: TẠO FILE UPLOAD SERVICE

### 4.1. Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
npm install -D @types/multer
```

### 4.2. Material Upload Service

**File:** `src/features/marketplace/services/material-upload.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MaterialUploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('S3_BUCKET_NAME');
  }

  async uploadMaterial(
    file: Express.Multer.File,
    teacherId: string,
    materialType: string,
  ): Promise<{ file_url: string; file_size: number }> {
    // Validate file type
    this.validateFileType(file, materialType);

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const key = `materials/${teacherId}/${Date.now()}-${filename}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    });

    await this.s3Client.send(command);

    return {
      file_url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
      file_size: file.size,
    };
  }

  async uploadThumbnail(
    file: Express.Multer.File,
    teacherId: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const key = `thumbnails/${teacherId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  async getSignedDownloadUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    const key = this.extractKeyFromUrl(fileUrl);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private validateFileType(file: Express.Multer.File, materialType: string): void {
    const allowedTypes = {
      pdf: ['application/pdf'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      slide: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    };

    const allowed = allowedTypes[materialType] || [];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type for ${materialType}`);
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 500MB limit');
    }
  }

  private extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  }
}
```

---

## 📝 BƯỚC 5: TẠO MARKETPLACE SERVICE

**File:** `src/features/marketplace/services/marketplace.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Material } from '../entities/material.entity';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import { MaterialReview } from '../entities/material-review.entity';
import { MaterialCategory } from '../entities/material-category.entity';
import { User } from '../../../users/user.entity';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { MaterialQueryDto } from '../dto/material-query.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { CreditsService } from '../../credits/credits.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    @InjectRepository(MaterialPurchase)
    private purchaseRepository: Repository<MaterialPurchase>,
    @InjectRepository(MaterialReview)
    private reviewRepository: Repository<MaterialReview>,
    @InjectRepository(MaterialCategory)
    private categoryRepository: Repository<MaterialCategory>,
    private creditsService: CreditsService,
  ) {}

  // ==================== STUDENT ENDPOINTS ====================

  async findAll(query: MaterialQueryDto) {
    const { page, limit, search, material_type, category_id, language, level, sort_by } = query;

    const queryBuilder = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.teacher', 'teacher')
      .leftJoinAndSelect('material.category', 'category')
      .where('material.is_published = :published', { published: true });

    // Filters
    if (search) {
      queryBuilder.andWhere(
        '(material.title LIKE :search OR material.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (material_type) {
      queryBuilder.andWhere('material.material_type = :type', { type: material_type });
    }

    if (category_id) {
      queryBuilder.andWhere('material.category_id = :categoryId', { categoryId: category_id });
    }

    if (language) {
      queryBuilder.andWhere('material.language = :language', { language });
    }

    if (level) {
      queryBuilder.andWhere('material.level = :level', { level });
    }

    // Sorting
    switch (sort_by) {
      case 'popular':
        queryBuilder.orderBy('material.total_sales', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('material.rating', 'DESC');
        break;
      case 'price_low':
        queryBuilder.orderBy('material.price_credits', 'ASC');
        break;
      case 'price_high':
        queryBuilder.orderBy('material.price_credits', 'DESC');
        break;
      default:
        queryBuilder.orderBy('material.created_at', 'DESC');
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [materials, total] = await queryBuilder.getManyAndCount();

    return {
      data: materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const material = await this.materialRepository.findOne({
      where: { id, is_published: true },
      relations: ['teacher', 'category', 'reviews', 'reviews.user'],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Increment view count
    await this.materialRepository.increment({ id }, 'view_count', 1);

    return material;
  }

  async purchaseMaterial(materialId: string, user: User) {
    const material = await this.findOne(materialId);

    // Check if already purchased
    const existingPurchase = await this.purchaseRepository.findOne({
      where: {
        material: { id: materialId },
        user: { id: user.id },
      },
    });

    if (existingPurchase) {
      throw new BadRequestException('You have already purchased this material');
    }

    // Check credit balance
    if (user.credit_balance < material.price_credits) {
      throw new BadRequestException('Insufficient credits');
    }

    // Deduct credits and create transaction
    const transaction = await this.creditsService.deductCredits(
      user.id,
      material.price_credits,
      `Purchase material: ${material.title}`,
      { material_id: materialId },
    );

    // Create purchase record
    const purchase = this.purchaseRepository.create({
      material,
      user,
      price_paid: material.price_credits,
      transaction,
    });

    await this.purchaseRepository.save(purchase);

    // Update material stats
    await this.materialRepository.increment({ id: materialId }, 'total_sales', 1);
    await this.materialRepository.increment(
      { id: materialId },
      'total_revenue',
      material.price_credits,
    );

    // Distribute revenue to teacher
    await this.creditsService.distributeRevenue(transaction.id, material.teacher.id, materialId);

    return purchase;
  }

  async getMyPurchases(userId: string, page: number = 1, limit: number = 20) {
    const [purchases, total] = await this.purchaseRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['material', 'material.teacher'],
      order: { purchased_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createReview(materialId: string, user: User, dto: CreateReviewDto) {
    // Check if user purchased the material
    const purchase = await this.purchaseRepository.findOne({
      where: {
        material: { id: materialId },
        user: { id: user.id },
      },
    });

    if (!purchase) {
      throw new ForbiddenException('You must purchase the material before reviewing');
    }

    // Check if already reviewed
    const existingReview = await this.reviewRepository.findOne({
      where: {
        material: { id: materialId },
        user: { id: user.id },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this material');
    }

    const review = this.reviewRepository.create({
      material: { id: materialId },
      user,
      rating: dto.rating,
      comment: dto.comment,
      is_verified_purchase: true,
    });

    await this.reviewRepository.save(review);

    // Update material rating
    await this.updateMaterialRating(materialId);

    return review;
  }

  private async updateMaterialRating(materialId: string) {
    const reviews = await this.reviewRepository.find({
      where: { material: { id: materialId } },
    });

    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await this.materialRepository.update(materialId, {
      rating: avgRating,
      total_reviews: totalReviews,
    });
  }

  // ==================== TEACHER ENDPOINTS ====================

  async createMaterial(dto: CreateMaterialDto, teacher: User, fileUrl: string, fileSize: number) {
    const material = this.materialRepository.create({
      ...dto,
      teacher,
      file_url: fileUrl,
      file_size: fileSize,
    });

    return await this.materialRepository.save(material);
  }

  async getMyMaterials(teacherId: string, page: number = 1, limit: number = 20) {
    const [materials, total] = await this.materialRepository.findAndCount({
      where: { teacher: { id: teacherId } },
      relations: ['category'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateMaterial(id: string, teacherId: string, dto: UpdateMaterialDto) {
    const material = await this.materialRepository.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!material) {
      throw new NotFoundException('Material not found or you do not own it');
    }

    Object.assign(material, dto);
    return await this.materialRepository.save(material);
  }

  async deleteMaterial(id: string, teacherId: string) {
    const material = await this.materialRepository.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!material) {
      throw new NotFoundException('Material not found or you do not own it');
    }

    await this.materialRepository.remove(material);
    return { message: 'Material deleted successfully' };
  }

  async publishMaterial(id: string, teacherId: string) {
    const material = await this.materialRepository.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    material.is_published = true;
    material.published_at = new Date();
    return await this.materialRepository.save(material);
  }

  async getSalesStats(teacherId: string) {
    const materials = await this.materialRepository.find({
      where: { teacher: { id: teacherId } },
    });

    const totalRevenue = materials.reduce((sum, m) => sum + m.total_revenue, 0);
    const totalSales = materials.reduce((sum, m) => sum + m.total_sales, 0);

    return {
      total_materials: materials.length,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        sales: m.total_sales,
        revenue: m.total_revenue,
        rating: m.rating,
      })),
    };
  }
}
```

---

## 📝 BƯỚC 6: TẠO CONTROLLERS

Tôi sẽ tạo file tiếp theo với controllers...

**Tiếp tục?** Tôi có thể tạo:
1. Controllers (Student, Teacher, Admin)
2. Module configuration
3. Frontend components
4. Testing guide

Bạn muốn tôi tiếp tục không?
