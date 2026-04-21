import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class SignUpDto {
  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Tên hiển thị của người dùng',
    example: 'Nguyễn Văn A',
    minLength: 3,
  })
  name: string;

  @IsEmail()
  @IsString()
  @ApiProperty({
    description: 'Email đăng ký (phải là duy nhất trong hệ thống)',
    example: 'newuser@foxtek.com',
  })
  email: string;

  @IsString()
  @MinLength(3)
  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 3 ký tự, sẽ được hash bằng bcrypt)',
    example: 'securePassword123',
    minLength: 3,
  })
  password: string;
}