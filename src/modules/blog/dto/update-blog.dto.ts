import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BlogStatus } from '../entity/blog.entity';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tiêu đề bài viết',
    example: 'Tiêu đề đã cập nhật',
  })
  title: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Nội dung HTML bài viết',
    example: '<h2>Nội dung mới</h2><p>Đã cập nhật...</p>',
  })
  content: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Mô tả ngắn bài viết',
    example: 'Mô tả mới cho bài viết',
  })
  description: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'URL ảnh bìa mới',
    example: 'http://localhost:3000/static/uploads/new-thumbnail.jpg',
  })
  thumbnail: string;

  @IsOptional()
  @IsEnum(BlogStatus)
  @ApiPropertyOptional({
    description: 'Trạng thái bài viết',
    enum: BlogStatus,
    example: BlogStatus.PUSHLISH,
  })
  status: BlogStatus;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID danh mục mới',
    example: 2,
  })
  categoryId: number;
}
