import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(250)
  @ApiProperty({
    description: 'Nội dung bình luận',
    example: 'Bài viết rất hay, cảm ơn tác giả!',
    maxLength: 250,
  })
  content: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'ID bài viết được bình luận',
    example: 1,
  })
  postId: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID comment cha (nếu là reply)',
    example: 5,
  })
  parentId?: number;
}