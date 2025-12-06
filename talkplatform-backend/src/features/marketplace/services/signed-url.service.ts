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

