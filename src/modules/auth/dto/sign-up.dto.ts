import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, IsEmail } from "class-validator";

export class SignUpDto {
    @IsString()
    @MinLength(3)
    @ApiProperty()
    name: string;

    @IsEmail()
    @IsString()
    @ApiProperty()
    email: string;

    @IsString()
    @MinLength(3)
    @ApiProperty()
    password: string;
}