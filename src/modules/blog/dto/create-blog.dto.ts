import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, MaxLength } from "class-validator"

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
}