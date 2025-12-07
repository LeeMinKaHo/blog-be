import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateCommentDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(250)
    content: string
    @IsNotEmpty()
    @IsNumber()
    postId: number
    @IsOptional()
    @IsNumber()
    parentId?: number
}