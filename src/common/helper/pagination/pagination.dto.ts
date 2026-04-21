import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Số lượng item mỗi trang',
    example: 10,
    default: 10,
  })
  limit: number = 10;

  // Các filter params dùng trong GET /blogs — phải khai báo để tránh lỗi forbidNonWhitelisted
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm',
    example: 'nestjs',
  })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Lọc theo ID danh mục',
    example: 1,
  })
  categoryId?: number;
}
