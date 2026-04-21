import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|avif|webp)$/)) {
          return callback(new Error('Chỉ cho phép upload file ảnh!'), false);
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload ảnh', description: 'Upload file ảnh (jpg, png, gif, avif, webp). Trả về URL để nhúng vào bài viết hoặc avatar.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File ảnh cần upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh (jpg, png, gif, avif, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Upload thành công',
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', example: 'image-1713600000000.webp' },
        url: { type: 'string', example: 'http://localhost:3000/static/images/image-1713600000000.webp' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'File không hợp lệ (sai định dạng).' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập.' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileName = await this.filesService.saveImage(file);

    return {
      filename: fileName,
      url: `${process.env.SITE_URL || 'http://localhost:3000'}/static/images/${fileName}`,
    };
  }
}
