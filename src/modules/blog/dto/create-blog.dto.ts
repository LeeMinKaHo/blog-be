import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, MaxLength } from "class-validator"

export class CreateBlogDto {
    @MaxLength(125)
    @IsNotEmpty()
    @ApiProperty()
    title: string
    @MaxLength(2000)
    @IsNotEmpty()
    @ApiProperty()
    content: string
    @IsNotEmpty()
    @ApiProperty()
    categoryId: number
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty()
    descrtiption: string
    @MaxLength(2048)
    @ApiProperty()
    thumbnail: string
}