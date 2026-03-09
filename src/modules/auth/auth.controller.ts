import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { SignUpDto } from './dto/sign-up.dto';
import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class VerifyEmailDto {
  @IsEmail()
  @ApiProperty()
  email: string;

  @IsString()
  @Length(6, 6)
  @ApiProperty()
  code: string;
}

class ResendVerificationDto {
  @IsEmail()
  @ApiProperty()
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Public()
  @Post('sign-in')
  @Throttle({
    default: {
      ttl: 60,
      limit: 5,
    },
  })
  async signIn(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('LoginDto:', loginDto);
    const { user, accessToken, refreshToken } =
      await this.authService.signIn(loginDto);

    // ✅ access token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15, // 15 phút
    });

    // ✅ refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
    });

    // 👉 FE nhận role để redirect đúng trang
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
  @Public()
  @Post('sign-up')
  @Throttle({
    default: {
      ttl: 60,
      limit: 5,
    },
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmailAndRefreshToken(dto.email, dto.code);

    // Phát hành token mới có isVerified = true vào cookie (không cần đăng nhập lại)
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
    }

    return { message: result.message };
  }

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { ttl: 60, limit: 3 } })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: any) {
    // Trả về đầy đủ payload JWT, bao gồm isVerified
    const role = user.role || (Array.isArray(user.roles) ? user.roles[0] : user.roles);
    return {
      id: user.sub,
      email: user.email,
      role,                        // string — dùng cho AdminGuard, redirect
      roles: user.roles || [role], // array — backward compat
      isVerified: user.isVerified ?? false,
    };
  }
}
