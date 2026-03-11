import { ApiProperty } from "@nestjs/swagger"
import { IsEnum, IsNotEmpty, IsOptional, MaxLength } from "class-validator"
import { BlogStatus } from "../entity/blog.entity"

export class CreateBlogDto {
    @MaxLength(125)
    @IsNotEmpty()
    @ApiProperty()
    title: string
    @IsNotEmpty()
    @ApiProperty()
    content: string
    @IsNotEmpty()
    @ApiProperty()
    categoryId: number
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty()
    description: string
    @MaxLength(2048)
    @ApiProperty()
    thumbnail: string
    @IsOptional()
    @IsEnum(BlogStatus)
    @ApiProperty({ enum: BlogStatus, required: false })
    status?: BlogStatus

    @IsOptional()
    @ApiProperty({ required: false })
    type?: string
}