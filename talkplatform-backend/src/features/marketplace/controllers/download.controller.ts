import {
    Controller,
    Get,
    Param,
    Res,
    StreamableFile,
    NotFoundException,
    UnauthorizedException,
    Logger,
    UseGuards,
    Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { SignedUrlService } from '../services/signed-url.service';
import { MaterialService } from '../services/material.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import { Material } from '../entities/material.entity';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { Account } from '../../../core/auth/decorators/account.decorator';
import { User } from '../../../users/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Marketplace Download')
@Controller('marketplace/download')
export class DownloadController {
    private readonly logger = new Logger(DownloadController.name);

    constructor(
        private readonly signedUrlService: SignedUrlService,
        private readonly materialService: MaterialService,
        @InjectRepository(MaterialPurchase)
        private readonly purchaseRepository: Repository<MaterialPurchase>,
        @InjectRepository(Material)
        private readonly materialRepository: Repository<Material>,
    ) {}

    /**
     * GET /marketplace/download/:payload/:signature
     * Download material with signed URL
     * 
     * Security enhancements:
     * - Verify user_id matches current user (except for public previews)
     * - Log IP address for audit trail
     */
    @Get(':payload/:signature')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download material using signed URL' })
    @ApiResponse({ status: 200, description: 'File stream' })
    @ApiResponse({ status: 401, description: 'Unauthorized or expired link' })
    @ApiResponse({ status: 404, description: 'File not found' })
    async downloadMaterial(
        @Param('payload') encodedPayload: string,
        @Param('signature') signature: string,
        @Account() user: User,
        @Request() req: any,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        // Verify signed URL
        const payload = this.signedUrlService.verifySignedUrl(
            encodedPayload,
            signature,
        );

        // Security: Verify user_id matches current user (except for public previews)
        if (payload.user_id !== 'public' && payload.user_id !== user.id) {
            this.logger.warn(
                `User ${user.id} attempted to access download link for user ${payload.user_id}`,
            );
            throw new UnauthorizedException('This download link belongs to another user');
        }

        // Log download attempt for audit trail
        this.logger.log({
            event: 'material_download',
            material_id: payload.material_id,
            user_id: payload.user_id,
            type: payload.type,
            ip: req.ip || req.headers['x-forwarded-for'],
            user_agent: req.headers['user-agent'],
        });

        // Get material
        const material = await this.materialRepository.findOne({
            where: { id: payload.material_id },
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        // Determine file path
        let filePath: string;
        let filename: string;

        if (payload.type === 'preview') {
            // Preview download (public or purchased)
            if (!material.preview_url) {
                throw new NotFoundException('Preview not available');
            }
            filePath = path.join(process.cwd(), material.preview_url);
            filename = `preview_${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
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
            const ext = path.extname(material.file_url) || '.pdf';
            filename = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;

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

            // Also increment material download count
            await this.materialRepository.increment(
                { id: material.id },
                'download_count',
                1,
            );
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            this.logger.error(`File not found: ${filePath}`);
            throw new NotFoundException('File not found on server');
        }

        // Stream file
        const file = fs.createReadStream(filePath);

        // Set headers
        res.set({
            'Content-Type': this.getContentType(filePath),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        });

        this.logger.log(`Streaming file: ${filename} for material ${payload.material_id}`);

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
            '.ppt': 'application/vnd.ms-powerpoint',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}

