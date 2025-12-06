# PHASE 3: PDF PREVIEW GENERATOR - IMPLEMENTATION GUIDE

**Ngày tạo:** 06/12/2025  
**Độ ưu tiên:** 🟡 MEDIUM  
**Thời gian ước tính:** 1 ngày

---

## 🎯 MỤC TIÊU

Tự động tạo preview cho materials (đặc biệt là PDF):

1. ✅ Extract 3 trang đầu tiên của PDF
2. ✅ Add watermark "PREVIEW" lên preview
3. ✅ Generate thumbnail từ trang đầu
4. ✅ Tự động trigger khi upload material
5. ✅ Store preview riêng biệt với file gốc

---

## 📦 DEPENDENCIES

### Backend Dependencies

```bash
cd talkplatform-backend
npm install pdf-lib pdf-parse sharp pdf-img-convert
```

**Packages:**
- `pdf-lib`: Manipulate PDF files (extract pages, add watermark)
- `pdf-parse`: Parse PDF metadata
- `sharp`: Image processing (resize, compress)
- `pdf-img-convert`: **Convert PDF pages to images** (for real thumbnails)

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Create PDF Service

**File:** `talkplatform-backend/src/features/marketplace/services/pdf.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PdfService {
    private readonly logger = new Logger(PdfService.name);
    private readonly uploadsDir = path.join(process.cwd(), 'uploads');
    private readonly previewsDir = path.join(process.cwd(), 'uploads', 'previews');
    private readonly thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');

    constructor() {
        // Ensure directories exist
        this.ensureDirectories();
    }

    private async ensureDirectories() {
        await fs.mkdir(this.previewsDir, { recursive: true });
        await fs.mkdir(this.thumbnailsDir, { recursive: true });
    }

    /**
     * Generate preview PDF (first 3 pages with watermark)
     */
    async generatePreview(
        originalFilePath: string,
        materialId: string,
    ): Promise<{ previewPath: string; thumbnailPath: string; pageCount: number }> {
        try {
            this.logger.log(`Generating preview for ${originalFilePath}`);

            // Read original PDF
            const pdfBytes = await fs.readFile(originalFilePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Get page count
            const pageCount = pdfDoc.getPageCount();
            this.logger.log(`PDF has ${pageCount} pages`);

            // Create new PDF for preview (max 3 pages)
            const previewDoc = await PDFDocument.create();
            const pagesToCopy = Math.min(3, pageCount);

            // Copy first 3 pages
            const copiedPages = await previewDoc.copyPages(
                pdfDoc,
                Array.from({ length: pagesToCopy }, (_, i) => i),
            );

            // Add watermark to each page
            const font = await previewDoc.embedFont(StandardFonts.HelveticaBold);
            
            for (const page of copiedPages) {
                previewDoc.addPage(page);
                
                const { width, height } = page.getSize();
                
                // Add diagonal watermark
                page.drawText('PREVIEW', {
                    x: width / 2 - 100,
                    y: height / 2,
                    size: 60,
                    font,
                    color: rgb(0.8, 0.8, 0.8),
                    opacity: 0.3,
                    rotate: { angle: -45, type: 'degrees' },
                });
            }

            // Save preview PDF
            const previewBytes = await previewDoc.save();
            const previewFilename = `preview_${materialId}.pdf`;
            const previewPath = path.join(this.previewsDir, previewFilename);
            await fs.writeFile(previewPath, previewBytes);

            this.logger.log(`Preview saved to ${previewPath}`);

            // Generate thumbnail from first page
            const thumbnailPath = await this.generateThumbnail(
                originalFilePath,
                materialId,
            );

            return {
                previewPath: `/uploads/previews/${previewFilename}`,
                thumbnailPath,
                pageCount,
            };
        } catch (error) {
            this.logger.error(`Failed to generate preview: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Generate thumbnail from first page of PDF
     * Uses pdf-img-convert to convert PDF page to actual image
     */
    async generateThumbnail(
        pdfPath: string,
        materialId: string,
    ): Promise<string> {
        try {
            const pdfImgConvert = require('pdf-img-convert');
            
            const thumbnailFilename = `thumb_${materialId}.png`;
            const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);

            // Convert first page of PDF to image
            // Returns array of images (one per page)
            const outputImages = await pdfImgConvert.convert(pdfPath, {
                width: 400,        // Thumbnail width
                height: 600,       // Thumbnail height (auto-calculated if not set)
                page_numbers: [1], // Only first page
                base64: false,     // Return as Buffer
            });

            if (!outputImages || outputImages.length === 0) {
                throw new Error('Failed to convert PDF to image');
            }

            // Get first page image
            const imageBuffer = outputImages[0];

            // Optimize with sharp (compress, ensure PNG format)
            const optimizedBuffer = await sharp(imageBuffer)
                .resize(400, 600, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .png({ quality: 80, compressionLevel: 9 })
                .toBuffer();

            await fs.writeFile(thumbnailPath, optimizedBuffer);

            this.logger.log(`Thumbnail generated: ${thumbnailFilename} (${optimizedBuffer.length} bytes)`);

            return `/uploads/thumbnails/${thumbnailFilename}`;
        } catch (error) {
            this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);
            // Return default thumbnail on error
            return '/default-thumbnail.png';
        }
    }

    /**
     * Extract PDF metadata
     */
    async extractMetadata(filePath: string): Promise<{
        pageCount: number;
        title?: string;
        author?: string;
        fileSize: number;
    }> {
        try {
            const buffer = await fs.readFile(filePath);
            const data = await pdfParse(buffer);

            const stats = await fs.stat(filePath);

            return {
                pageCount: data.numpages,
                title: data.info?.Title,
                author: data.info?.Author,
                fileSize: stats.size,
            };
        } catch (error) {
            this.logger.error(`Failed to extract metadata: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate PDF file is not corrupt
     */
    async validatePdf(filePath: string): Promise<void> {
        try {
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // Check if PDF has at least 1 page
            const pageCount = pdfDoc.getPageCount();
            if (pageCount === 0) {
                throw new Error('PDF has no pages');
            }

            this.logger.log(`PDF validated: ${pageCount} pages`);
        } catch (error) {
            this.logger.error(`PDF validation failed: ${error.message}`);
            throw new BadRequestException('Invalid or corrupt PDF file');
        }
    }

    /**
     * Delete preview and thumbnail files
     */
    async deletePreviewFiles(materialId: string): Promise<void> {
        try {
            const previewPath = path.join(this.previewsDir, `preview_${materialId}.pdf`);
            const thumbnailPath = path.join(this.thumbnailsDir, `thumb_${materialId}.png`);

            await Promise.all([
                fs.unlink(previewPath).catch(() => {}),
                fs.unlink(thumbnailPath).catch(() => {}),
            ]);

            this.logger.log(`Deleted preview files for material ${materialId}`);
        } catch (error) {
            this.logger.error(`Failed to delete preview files: ${error.message}`);
        }
    }
}
```

### 2. Update Upload Service

**File:** `talkplatform-backend/src/features/marketplace/services/upload.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from './pdf.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly uploadsDir = path.join(process.cwd(), 'uploads');

    constructor(private readonly pdfService: PdfService) {}

    /**
     * Save uploaded file and generate preview if PDF
     */
    async saveFile(file: Express.Multer.File): Promise<{
        file_url: string;
        file_size: number;
        preview_url?: string;
        thumbnail_url?: string;
        page_count?: number;
    }> {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `${timestamp}_${file.originalname}`;
            const filePath = path.join(this.uploadsDir, filename);

            // Save file
            await fs.writeFile(filePath, file.buffer);

            this.logger.log(`File saved: ${filename}`);

            const result: any = {
                file_url: `/uploads/${filename}`,
                file_size: file.size,
            };

            // If PDF, validate and generate preview
            if (file.mimetype === 'application/pdf') {
                try {
                    // Validate PDF is not corrupt
                    await this.pdfService.validatePdf(filePath);
                    
                    const materialId = `temp_${timestamp}`;
                    
                    const { previewPath, thumbnailPath, pageCount } =
                        await this.pdfService.generatePreview(filePath, materialId);

                    result.preview_url = previewPath;
                    result.thumbnail_url = thumbnailPath;
                    result.page_count = pageCount;

                    this.logger.log(`Preview generated for PDF: ${filename}`);
                } catch (pdfError) {
                    // Delete uploaded file if PDF is corrupt
                    await fs.unlink(filePath).catch(() => {});
                    this.logger.error(`Corrupt PDF detected: ${filename}`, pdfError);
                    throw new BadRequestException('Invalid or corrupt PDF file');
                }
            }

            return result;
        } catch (error) {
            this.logger.error(`Failed to save file: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Regenerate preview for existing material
     */
    async regeneratePreview(
        fileUrl: string,
        materialId: string,
    ): Promise<{ preview_url: string; thumbnail_url: string }> {
        const filename = path.basename(fileUrl);
        const filePath = path.join(this.uploadsDir, filename);

        const { previewPath, thumbnailPath } = await this.pdfService.generatePreview(
            filePath,
            materialId,
        );

        return {
            preview_url: previewPath,
            thumbnail_url: thumbnailPath,
        };
    }
}
```

### 3. Update Material Service

**File:** `talkplatform-backend/src/features/marketplace/services/material.service.ts`

Add preview generation to create method:

```typescript
async create(createMaterialDto: CreateMaterialDto, teacher: User): Promise<Material> {
    const material = this.materialRepository.create({
        ...createMaterialDto,
        teacher_id: teacher.id,
        is_published: false,
    });

    const savedMaterial = await this.materialRepository.save(material);

    // If PDF and has file_url, regenerate preview with actual material ID
    if (
        savedMaterial.material_type === MaterialType.PDF &&
        savedMaterial.file_url
    ) {
        try {
            const { preview_url, thumbnail_url } =
                await this.uploadService.regeneratePreview(
                    savedMaterial.file_url,
                    savedMaterial.id,
                );

            savedMaterial.preview_url = preview_url;
            savedMaterial.thumbnail_url = thumbnail_url;

            await this.materialRepository.save(savedMaterial);
        } catch (error) {
            this.logger.error(
                `Failed to generate preview for material ${savedMaterial.id}`,
                error,
            );
        }
    }

    return savedMaterial;
}

/**
 * Delete material and cleanup files
 */
async remove(id: string, teacherId: string): Promise<void> {
    const material = await this.findOne(id);

    if (material.teacher_id !== teacherId) {
        throw new ForbiddenException('You can only delete your own materials');
    }

    // Delete physical files before removing from database
    try {
        // Delete main file
        if (material.file_url) {
            const filePath = path.join(process.cwd(), material.file_url);
            await fs.unlink(filePath).catch(() => {});
        }

        // Delete preview and thumbnail files
        await this.pdfService.deletePreviewFiles(id);

        this.logger.log(`Deleted files for material ${id}`);
    } catch (error) {
        this.logger.error(`Failed to delete files for material ${id}: ${error.message}`);
        // Continue with database deletion even if file deletion fails
    }

    await this.materialRepository.remove(material);
}
```

### 4. Update Marketplace Module

**File:** `talkplatform-backend/src/features/marketplace/marketplace.module.ts`

```typescript
import { PdfService } from './services/pdf.service'; // NEW

@Module({
    imports: [
        TypeOrmModule.forFeature([...]),
        WalletModule,
    ],
    controllers: [...],
    providers: [
        MaterialService,
        UploadService,
        AnalyticsService,
        PdfService, // NEW
    ],
    exports: [MaterialService, AnalyticsService, PdfService],
})
export class MarketplaceModule {}
```

### 5. Add Preview Endpoint

**File:** `talkplatform-backend/src/features/marketplace/controllers/student-material.controller.ts`

```typescript
/**
 * GET /marketplace/student/materials/:id/preview
 * Get preview URL (no purchase required)
 */
@Get(':id/preview')
async getPreview(@Param('id') id: string) {
    const material = await this.materialService.findOne(id);
    
    if (!material.preview_url) {
        throw new NotFoundException('Preview not available');
    }

    return {
        preview_url: material.preview_url,
        thumbnail_url: material.thumbnail_url,
        page_count: material.page_count,
    };
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Update Material Card Component

**File:** `talkplatform-frontend/components/marketplace/material-card.tsx`

```typescript
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download, Star } from 'lucide-react';
import { Material } from '@/api/marketplace';
import Link from 'next/link';

export function MaterialCard({ material }: { material: Material }) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Thumbnail */}
            <div className="relative h-48 bg-gray-100">
                {material.thumbnail_url ? (
                    <img
                        src={material.thumbnail_url}
                        alt={material.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <Eye className="w-12 h-12" />
                    </div>
                )}
                
                {/* Preview Badge */}
                {material.preview_url && (
                    <Badge className="absolute top-2 right-2 bg-blue-500">
                        Preview Available
                    </Badge>
                )}
            </div>

            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg line-clamp-2">
                        {material.title}
                    </h3>
                    <Badge variant="outline" className="capitalize ml-2">
                        {material.material_type}
                    </Badge>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {material.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{material.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{material.total_sales} sales</span>
                    </div>
                    {material.page_count && (
                        <span>{material.page_count} pages</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-green-600">
                        {material.price_credits} Credits
                    </div>
                    <div className="flex gap-2">
                        {material.preview_url && (
                            <Link href={`/marketplace/${material.id}/preview`}>
                                <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-1" />
                                    Preview
                                </Button>
                            </Link>
                        )}
                        <Link href={`/marketplace/${material.id}`}>
                            <Button size="sm">View Details</Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
```

### 2. Create Preview Viewer Page

**File:** `talkplatform-frontend/app/marketplace/[id]/preview/page.tsx`

```typescript
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { marketplaceApi } from '@/api/marketplace';

export default function PreviewPage() {
    const params = useParams();
    const router = useRouter();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPreview();
    }, [params.id]);

    const loadPreview = async () => {
        try {
            const response = await marketplaceApi.getPreview(params.id as string);
            setPreviewUrl(response.preview_url);
        } catch (error) {
            console.error('Failed to load preview:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!previewUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-gray-500 mb-4">Preview not available</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        This is a preview. Purchase to access the full material.
                    </p>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                    src={previewUrl}
                    className="w-full h-[800px]"
                    title="Material Preview"
                />
            </div>
        </div>
    );
}
```

---

## 🧪 TESTING GUIDE

### 1. Test Preview Generation

```bash
# Upload a PDF material
curl -X POST "http://localhost:3000/api/v1/marketplace/teacher/materials/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"

# Check if preview files were created
ls uploads/previews/
ls uploads/thumbnails/
```

### 2. Manual Testing Steps

1. **Upload PDF** as teacher
2. **Check preview_url** in database
3. **View preview** as student (no purchase)
4. **Verify watermark** appears on preview
5. **Purchase material** and verify full access

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Install dependencies (`pdf-lib`, `pdf-parse`, `sharp`)
- [ ] Create `PdfService`
- [ ] Update `UploadService`
- [ ] Update `MaterialService`
- [ ] Add preview endpoint
- [ ] Create preview viewer page
- [ ] Update material card component
- [ ] Test with real PDF files
- [ ] Verify watermark quality
- [ ] Test thumbnail generation
- [ ] Deploy to production

---

**Next:** `05_Signed_URL.md`
