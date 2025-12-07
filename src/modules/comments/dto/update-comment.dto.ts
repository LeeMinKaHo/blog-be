import { IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean } from "class-validator";

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(250)
  content: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
