import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(250)
  @ApiProperty({
    description: 'Nội dung bình luận đã chỉnh sửa',
    example: 'Nội dung bình luận cập nhật',
    maxLength: 250,
  })
  content: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Trạng thái hiển thị comment (Admin dùng để ẩn/hiện)',
    example: true,
  })
  isActive?: boolean;
}
