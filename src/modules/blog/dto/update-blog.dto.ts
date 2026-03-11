import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BlogStatus } from '../entity/blog.entity';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsOptional()
  @IsEnum(BlogStatus)
  status: BlogStatus;

  @IsOptional()
  categoryId: number;

  @IsOptional()
  type?: string;
}
