import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsString()
  @ApiProperty({
    description: 'Email đăng nhập',
    example: 'user@foxtek.com',
  })
  email: string;

  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 3 ký tự)',
    example: 'password123',
    minLength: 3,
  })
  password: string;
}
