import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  title: string;
  @IsOptional()
  @IsString()
  content: string;
  @IsOptional()
  @IsString()
  descrtiption: string;
  @IsOptional()
  @IsString()
  thumbnail: string;
}
