import { IsNotEmpty, MaxLength } from "class-validator"

export class CreateBlogDto {
    @MaxLength(125)
    @IsNotEmpty()
    title: string
    @MaxLength(2000)
    @IsNotEmpty()
    content: string
    @IsNotEmpty()
    categoryId: number
    @IsNotEmpty()
    @MaxLength(500)
    descrtiption: string
    @MaxLength(2048)
    thumbnail: string
}