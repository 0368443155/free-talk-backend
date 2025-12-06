# PHASE 3: SIGNED URL FOR SECURE DOWNLOADS - IMPLEMENTATION GUIDE

**Ngày tạo:** 06/12/2025  
**Độ ưu tiên:** 🔴 HIGH (Security)  
**Thời gian ước tính:** 1 ngày

---

## 🎯 MỤC TIÊU

Implement secure download links với signed URLs:

1. ✅ Generate time-limited download URLs (15 minutes expiration)
2. ✅ Prevent unauthorized access to files
3. ✅ Track download attempts
4. ✅ Revoke access after expiration
5. ✅ Support both full material and preview downloads

---

## 🔐 SECURITY ARCHITECTURE

### Current Issue

```
❌ INSECURE: Direct file access
Student → /uploads/material_123.pdf → Direct Download
                    ↓
            No verification
            No expiration
            No tracking
```

### New Secure Flow

```
✅ SECURE: Signed URL with verification
Student → Request Download → Generate Signed URL (15min)
                                      ↓
                            Verify Purchase + Signature
                                      ↓
                            Stream File + Track Download
                                      ↓
                            URL Expires after 15min
```

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Create Signed URL Service

**File:** `talkplatform-backend/src/features/marketplace/services/signed-url.service.ts`

```typescript
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface SignedUrlPayload {
    material_id: string;
    user_id: string;
    type: 'full' | 'preview';
    expires_at: number; // Unix timestamp
}

@Injectable()
export class SignedUrlService {
    private readonly logger = new Logger(SignedUrlService.name);
    private readonly secret: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        // Use environment variable or generate random secret
        this.secret =
            this.configService.get<string>('SIGNED_URL_SECRET') ||
            crypto.randomBytes(32).toString('hex');
        
        this.baseUrl =
            this.configService.get<string>('API_URL') ||
            'http://localhost:3000/api/v1';

        this.logger.log('SignedUrlService initialized');
    }

    /**
     * Generate signed download URL
     */
    generateSignedUrl(
        materialId: string,
        userId: string,
        type: 'full' | 'preview' = 'full',
        expiresInMinutes: number = 15,
    ): string {
        const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

        const payload: SignedUrlPayload = {
            material_id: materialId,
            user_id: userId,
            type,
            expires_at: expiresAt,
        };

        // Create signature
        const signature = this.createSignature(payload);

        // Encode payload
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

        // Build URL
        const url = `${this.baseUrl}/marketplace/download/${encodedPayload}/${signature}`;

        this.logger.log(
            `Generated signed URL for material ${materialId}, expires at ${new Date(expiresAt).toISOString()}`,
        );

        return url;
    }

    /**
     * Verify signed URL
     */
    verifySignedUrl(
        encodedPayload: string,
        signature: string,
    ): SignedUrlPayload {
        try {
            // Decode payload
            const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
            const payload: SignedUrlPayload = JSON.parse(payloadJson);

            // Check expiration
            if (Date.now() > payload.expires_at) {
                throw new UnauthorizedException('Download link has expired');
            }

            // Verify signature
            const expectedSignature = this.createSignature(payload);
            if (signature !== expectedSignature) {
                throw new UnauthorizedException('Invalid download link');
            }

            this.logger.log(`Verified signed URL for material ${payload.material_id}`);

            return payload;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Failed to verify signed URL: ${error.message}`);
            throw new UnauthorizedException('Invalid download link');
        }
    }

    /**
     * Create HMAC signature
     */
    private createSignature(payload: SignedUrlPayload): string {
        const data = JSON.stringify({
            material_id: payload.material_id,
            user_id: payload.user_id,
            type: payload.type,
            expires_at: payload.expires_at,
        });

        return crypto
            .createHmac('sha256', this.secret)
            .update(data)
            .digest('hex');
    }

    /**
     * Generate preview URL (no user required)
     */
    generatePreviewUrl(
        materialId: string,
        expiresInMinutes: number = 60,
    ): string {
        return this.generateSignedUrl(
            materialId,
            'public', // Special user ID for public previews
            'preview',
            expiresInMinutes,
        );
    }
}
```

### 2. Create Download Controller

**File:** `talkplatform-backend/src/features/marketplace/controllers/download.controller.ts`

```typescript
import {
    Controller,
    Get,
    Param,
    Res,
    StreamableFile,
    NotFoundException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SignedUrlService } from '../services/signed-url.service';
import { MaterialService } from '../services/material.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import * as fs from 'fs';
import * as path from 'path';

@Controller('marketplace/download')
export class DownloadController {
    private readonly logger = new Logger(DownloadController.name);

    constructor(
        private readonly signedUrlService: SignedUrlService,
        private readonly materialService: MaterialService,
        @InjectRepository(MaterialPurchase)
        private readonly purchaseRepository: Repository<MaterialPurchase>,
    ) {}

    /**
     * GET /marketplace/download/:payload/:signature
     * Download material with signed URL
     */
    @Get(':payload/:signature')
    async downloadMaterial(
        @Param('payload') encodedPayload: string,
        @Param('signature') signature: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        // Verify signed URL
        const payload = this.signedUrlService.verifySignedUrl(
            encodedPayload,
            signature,
        );

        this.logger.log(
            `Download request for material ${payload.material_id} by user ${payload.user_id}`,
        );

        // Get material
        const material = await this.materialService.findOne(payload.material_id);

        // Determine file path
        let filePath: string;
        let filename: string;

        if (payload.type === 'preview') {
            // Preview download (public or purchased)
            if (!material.preview_url) {
                throw new NotFoundException('Preview not available');
            }
            filePath = path.join(process.cwd(), material.preview_url);
            filename = `preview_${material.title}.pdf`;
        } else {
            // Full material download (requires purchase)
            if (payload.user_id === 'public') {
                throw new UnauthorizedException('Purchase required to download full material');
            }

            // Verify purchase
            const purchase = await this.purchaseRepository.findOne({
                where: {
                    material_id: payload.material_id,
                    user_id: payload.user_id,
                },
            });

            if (!purchase) {
                throw new UnauthorizedException('You must purchase this material first');
            }

            filePath = path.join(process.cwd(), material.file_url);
            filename = material.title + path.extname(material.file_url);

            // Track download
            await this.purchaseRepository.increment(
                { id: purchase.id },
                'download_count',
                1,
            );
            await this.purchaseRepository.update(
                { id: purchase.id },
                { last_downloaded_at: new Date() },
            );
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            this.logger.error(`File not found: ${filePath}`);
            throw new NotFoundException('File not found');
        }

        // Stream file
        const file = fs.createReadStream(filePath);

        // Set headers
        res.set({
            'Content-Type': this.getContentType(filePath),
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        });

        this.logger.log(`Streaming file: ${filename}`);

        return new StreamableFile(file);
    }

    private getContentType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.zip': 'application/zip',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}
```

### 3. Update Material Service

**File:** `talkplatform-backend/src/features/marketplace/services/material.service.ts`

Update `getDownloadUrl` method:

```typescript
/**
 * Get signed download URL
 */
async getDownloadUrl(materialId: string, userId: string): Promise<{
    download_url: string;
    expires_at: Date;
}> {
    // Verify purchase
    const hasPurchased = await this.hasPurchased(materialId, userId);
    if (!hasPurchased) {
        throw new ForbiddenException('You must purchase this material first');
    }

    // Generate signed URL (15 minutes)
    const signedUrl = this.signedUrlService.generateSignedUrl(
        materialId,
        userId,
        'full',
        15,
    );

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return {
        download_url: signedUrl,
        expires_at: expiresAt,
    };
}

/**
 * Get preview URL (public access)
 */
async getPreviewUrl(materialId: string): Promise<{
    preview_url: string;
    expires_at: Date;
}> {
    const material = await this.findOne(materialId);

    if (!material.preview_url) {
        throw new NotFoundException('Preview not available');
    }

    // Generate signed preview URL (60 minutes for previews)
    const signedUrl = this.signedUrlService.generatePreviewUrl(materialId, 60);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    return {
        preview_url: signedUrl,
        expires_at: expiresAt,
    };
}
```

### 4. Update Student Controller

**File:** `talkplatform-backend/src/features/marketplace/controllers/student-material.controller.ts`

```typescript
/**
 * GET /marketplace/student/materials/:id/download
 * Get signed download URL
 */
@Get(':id/download')
async getDownloadUrl(
    @Param('id') id: string,
    @Account() user: User,
) {
    return this.materialService.getDownloadUrl(id, user.id);
}

/**
 * GET /marketplace/student/materials/:id/preview-url
 * Get signed preview URL
 */
@Get(':id/preview-url')
async getPreviewUrl(@Param('id') id: string) {
    return this.materialService.getPreviewUrl(id);
}
```

### 5. Update Marketplace Module

**File:** `talkplatform-backend/src/features/marketplace/marketplace.module.ts`

```typescript
import { SignedUrlService } from './services/signed-url.service'; // NEW
import { DownloadController } from './controllers/download.controller'; // NEW

@Module({
    imports: [...],
    controllers: [
        TeacherMaterialController,
        StudentMaterialController,
        AdminMaterialController,
        AnalyticsController,
        DownloadController, // NEW
    ],
    providers: [
        MaterialService,
        UploadService,
        AnalyticsService,
        PdfService,
        SignedUrlService, // NEW
    ],
    exports: [MaterialService, AnalyticsService, PdfService, SignedUrlService],
})
export class MarketplaceModule {}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Update Marketplace API Client

**File:** `talkplatform-frontend/api/marketplace.ts`

```typescript
export const marketplaceApi = {
    // ... existing methods ...

    /**
     * Get signed download URL
     */
    getDownloadUrl: async (materialId: string): Promise<{
        download_url: string;
        expires_at: string;
    }> => {
        const response = await apiClient.get(
            `/marketplace/student/materials/${materialId}/download`,
        );
        return response.data;
    },

    /**
     * Get signed preview URL
     */
    getPreviewUrl: async (materialId: string): Promise<{
        preview_url: string;
        expires_at: string;
    }> => {
        const response = await apiClient.get(
            `/marketplace/student/materials/${materialId}/preview-url`,
        );
        return response.data;
    },

    /**
     * Download material (triggers browser download)
     */
    downloadMaterial: async (materialId: string): Promise<void> => {
        const { download_url } = await marketplaceApi.getDownloadUrl(materialId);
        
        // Open download URL in new tab
        window.open(download_url, '_blank');
    },
};
```

### 2. Update Material Detail Page

**File:** `talkplatform-frontend/app/marketplace/[id]/page.tsx`

```typescript
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye, Clock } from 'lucide-react';
import { marketplaceApi } from '@/api/marketplace';
import { useToast } from '@/components/ui/use-toast';

export default function MaterialDetailPage() {
    const [downloading, setDownloading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const { toast } = useToast();

    const handleDownload = async () => {
        try {
            setDownloading(true);
            
            // Get signed URL
            const response = await marketplaceApi.getDownloadUrl(materialId);
            
            setDownloadUrl(response.download_url);
            setExpiresAt(new Date(response.expires_at));

            // Auto-download
            window.open(response.download_url, '_blank');

            toast({
                title: "Download Started",
                description: "Your download link will expire in 15 minutes",
            });
        } catch (error: any) {
            toast({
                title: "Download Failed",
                description: error.response?.data?.message || "Failed to generate download link",
                variant: "destructive",
            });
        } finally {
            setDownloading(false);
        }
    };

    const handlePreview = async () => {
        try {
            const response = await marketplaceApi.getPreviewUrl(materialId);
            window.open(response.preview_url, '_blank');
        } catch (error) {
            toast({
                title: "Preview Failed",
                description: "Failed to load preview",
                variant: "destructive",
            });
        }
    };

    return (
        <div>
            {/* ... material details ... */}

            <div className="flex gap-4 mt-6">
                <Button onClick={handlePreview} variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                </Button>

                <Button onClick={handleDownload} disabled={downloading}>
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? 'Generating Link...' : 'Download'}
                </Button>
            </div>

            {/* Download Link Info */}
            {downloadUrl && expiresAt && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Clock className="w-4 h-4" />
                        <span>
                            Download link expires at {expiresAt.toLocaleTimeString()}
                        </span>
                    </div>
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-2 block"
                    >
                        Click here if download didn't start
                    </a>
                </div>
            )}
        </div>
    );
}
```

---

## 🔒 SECURITY BEST PRACTICES

### 1. Environment Variables

**File:** `talkplatform-backend/.env`

```env
# Signed URL Secret (generate with: openssl rand -hex 32)
SIGNED_URL_SECRET=your-secret-key-here

# API Base URL
API_URL=https://your-domain.com/api/v1
```

### 2. Rate Limiting

Add rate limiting to download endpoint:

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('marketplace/download')
@UseGuards(ThrottlerGuard) // Limit: 10 requests per minute
export class DownloadController {
    // ...
}
```

### 3. File Access Logging

Log all download attempts for security audit:

```typescript
this.logger.log({
    event: 'material_download',
    material_id: payload.material_id,
    user_id: payload.user_id,
    type: payload.type,
    ip: req.ip,
    user_agent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
});
```

---

## 🧪 TESTING GUIDE

### 1. Test Signed URL Generation

```bash
# Get download URL
curl -X GET "http://localhost:3000/api/v1/marketplace/student/materials/MATERIAL_ID/download" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "download_url": "http://localhost:3000/api/v1/marketplace/download/eyJ...../abc123...",
  "expires_at": "2025-12-06T15:30:00.000Z"
}
```

### 2. Test Download with Signed URL

```bash
# Use the signed URL from above
curl -X GET "http://localhost:3000/api/v1/marketplace/download/eyJ...../abc123..." \
  --output downloaded_file.pdf
```

### 3. Test Expiration

```bash
# Wait 16 minutes, then try to download
# Should return: 401 Unauthorized - "Download link has expired"
```

### 4. Test Invalid Signature

```bash
# Modify the signature
curl -X GET "http://localhost:3000/api/v1/marketplace/download/eyJ...../INVALID_SIG"
# Should return: 401 Unauthorized - "Invalid download link"
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Generate and set `SIGNED_URL_SECRET` in production
- [ ] Create `SignedUrlService`
- [ ] Create `DownloadController`
- [ ] Update `MaterialService`
- [ ] Update `StudentMaterialController`
- [ ] Update `MarketplaceModule`
- [ ] Update frontend API client
- [ ] Add rate limiting
- [ ] Add download logging
- [ ] Test signed URL generation
- [ ] Test expiration (wait 15+ minutes)
- [ ] Test invalid signatures
- [ ] Deploy to production

---

**Next:** `06_Testing_Guide.md`
