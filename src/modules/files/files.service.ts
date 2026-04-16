import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class FilesService {
    private readonly uploadPath = './uploads/images';

    constructor() {
        if (!existsSync(this.uploadPath)) {
            mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async saveImage(file: Express.Multer.File): Promise<string> {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const fileName = `${uniqueName}.avif`;
        const filePath = join(this.uploadPath, fileName);

        // Xử lý nén và chuyển đổi sang .avif bằng sharp
        await sharp(file.buffer)
            .avif({ quality: 60 }) // Tăng lên 60 để giữ độ chi tiết tốt hơn cho blog
            .toFile(filePath);

        return fileName;
    }
}
