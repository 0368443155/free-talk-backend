import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
    private readonly logger = new Logger(QrCodeService.name);

    /**
     * Generate QR code as data URL
     * @param text Text to encode in QR code (usually a URL)
     * @returns Data URL of QR code image
     */
    async generateDataUrl(text: string): Promise<string> {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(text, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            });

            this.logger.log(`QR code generated for: ${text.substring(0, 50)}...`);
            return qrCodeDataUrl;
        } catch (error) {
            this.logger.error(`Failed to generate QR code: ${error.message}`);
            throw new Error('Failed to generate QR code');
        }
    }

    /**
     * Generate QR code as buffer (for saving to file/S3)
     * @param text Text to encode in QR code
     * @returns Buffer of QR code image
     */
    async generateBuffer(text: string): Promise<Buffer> {
        try {
            const buffer = await QRCode.toBuffer(text, {
                errorCorrectionLevel: 'M',
                type: 'png',
                margin: 1,
                width: 300,
            });

            this.logger.log(`QR code buffer generated for: ${text.substring(0, 50)}...`);
            return buffer;
        } catch (error) {
            this.logger.error(`Failed to generate QR code buffer: ${error.message}`);
            throw new Error('Failed to generate QR code buffer');
        }
    }

    /**
     * Generate QR code and save to file (optional, for local storage)
     * @param text Text to encode
     * @param filePath Path to save QR code
     */
    async generateToFile(text: string, filePath: string): Promise<void> {
        try {
            await QRCode.toFile(filePath, text, {
                errorCorrectionLevel: 'M',
                type: 'png',
                margin: 1,
                width: 300,
            });

            this.logger.log(`QR code saved to file: ${filePath}`);
        } catch (error) {
            this.logger.error(`Failed to save QR code to file: ${error.message}`);
            throw new Error('Failed to save QR code to file');
        }
    }
}
