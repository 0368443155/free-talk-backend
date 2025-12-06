import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { PdfService } from './pdf.service';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private uploadDir: string;

    constructor(
        private configService: ConfigService,
        private pdfService: PdfService,
    ) {
        // Define upload directory relative to project root
        this.uploadDir = path.join(process.cwd(), 'uploads', 'materials');

        // Ensure directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(file: Express.Multer.File): Promise<{
        fileUrl: string;
        fileSize: number;
        previewUrl?: string;
        thumbnailUrl?: string;
        pageCount?: number;
    }> {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(this.uploadDir, fileName);

        // Write file to disk
        await fs.promises.writeFile(filePath, file.buffer);

        this.logger.log(`File saved: ${fileName}`);

        // Generate public URL
        const baseUrl = this.configService.get('BACKEND_URL') || 'http://localhost:3000';
        const fileUrl = `/uploads/materials/${fileName}`;

        const result: any = {
            fileUrl,
            fileSize: file.size,
        };

        // If PDF, validate and generate preview
        if (file.mimetype === 'application/pdf') {
            try {
                // Validate PDF is not corrupt
                await this.pdfService.validatePdf(filePath);
                
                const materialId = `temp_${uuidv4()}`;
                
                const { previewPath, thumbnailPath, pageCount } =
                    await this.pdfService.generatePreview(filePath, materialId);

                result.previewUrl = previewPath;
                result.thumbnailUrl = thumbnailPath;
                result.pageCount = pageCount;

                this.logger.log(`Preview generated for PDF: ${fileName}`);
            } catch (pdfError) {
                // Delete uploaded file if PDF is corrupt
                await fs.promises.unlink(filePath).catch(() => {});
                this.logger.error(`Corrupt PDF detected: ${fileName}`, pdfError);
                throw new BadRequestException('Invalid or corrupt PDF file');
            }
        }

        return result;
    }

    /**
     * Regenerate preview for existing material
     */
    async regeneratePreview(
        fileUrl: string,
        materialId: string,
    ): Promise<{ preview_url: string; thumbnail_url: string }> {
        // Extract filename from URL
        const filename = path.basename(fileUrl);
        const filePath = path.join(this.uploadDir, filename);

        if (!fs.existsSync(filePath)) {
            throw new BadRequestException('Original file not found');
        }

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
