import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên hiển thị',
    example: 'Lê Minh Khoa',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tên file avatar (từ upload API)',
    example: 'avatar-1234567890.jpg',
  })
  avatar?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Số điện thoại',
    example: '0901234567',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Địa chỉ',
    example: 'TP. Hồ Chí Minh, Việt Nam',
  })
  address?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Giới tính',
    example: 'Nam',
  })
  gender?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Ngày sinh (ISO 8601)',
    example: '2000-01-15',
  })
  birthday?: Date;
}
