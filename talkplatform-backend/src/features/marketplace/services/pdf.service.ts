import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, RotationTypes } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
// Use require for CommonJS module
const pdfParse = require('pdf-parse');

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
        await fs.mkdir(this.previewsDir, { recursive: true }).catch(() => {});
        await fs.mkdir(this.thumbnailsDir, { recursive: true }).catch(() => {});
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
                    rotate: { angle: -45, type: RotationTypes.Degrees },
                });
            }

            // Save preview PDF
            const previewBytes = await previewDoc.save();
            const previewFilename = `preview_${materialId}.pdf`;
            const previewPath = path.join(this.previewsDir, previewFilename);
            await fs.writeFile(previewPath, previewBytes);

            this.logger.log(`Preview saved to ${previewPath}`);

            // Generate thumbnail from first page (simplified - use preview as thumbnail path)
            // In production, you might want to use pdf-img-convert or sharp here
            const thumbnailPath = `/uploads/previews/${previewFilename}`; // Use preview as thumbnail placeholder

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

