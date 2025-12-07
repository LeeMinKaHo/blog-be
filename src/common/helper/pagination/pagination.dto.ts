import { IsOptional, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 10;
}
