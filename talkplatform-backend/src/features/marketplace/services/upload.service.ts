import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
    private uploadDir: string;

    constructor(private configService: ConfigService) {
        // Define upload directory relative to project root
        this.uploadDir = path.join(process.cwd(), 'uploads', 'materials');

        // Ensure directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(file: Express.Multer.File): Promise<{ fileUrl: string; fileSize: number }> {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(this.uploadDir, fileName);

        // Write file to disk
        await fs.promises.writeFile(filePath, file.buffer);

        // Generate public URL
        // Assuming backend runs on localhost:3001 or configured URL
        // We serve 'uploads' at /uploads
        const baseUrl = this.configService.get('BACKEND_URL') || 'http://localhost:3001';
        const fileUrl = `${baseUrl}/uploads/materials/${fileName}`;

        return { fileUrl, fileSize: file.size };
    }
}
