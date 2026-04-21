import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class CreateBlogDto {
  @MaxLength(125)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tiêu đề bài viết',
    example: 'Hướng dẫn NestJS cho người mới bắt đầu',
    maxLength: 125,
  })
  title: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'Nội dung HTML của bài viết (từ TipTap editor)',
    example: '<h2>Giới thiệu</h2><p>NestJS là một framework...</p>',
  })
  content: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID danh mục bài viết',
    example: 1,
  })
  categoryId: number;

  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({
    description: 'Mô tả ngắn (Sapô) hiển thị ở danh sách và SEO',
    example: 'Bài viết tổng quan về NestJS framework, phù hợp cho developer mới.',
    maxLength: 500,
  })
  description: string;

  @IsOptional()
  @MaxLength(2048)
  @ApiPropertyOptional({
    description: 'URL ảnh bìa (thumbnail) của bài viết',
    example: 'http://localhost:3000/static/uploads/thumbnail.jpg',
    maxLength: 2048,
  })
  thumbnail: string;
}