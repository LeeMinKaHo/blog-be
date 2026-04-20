import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import type { Request, Response } from 'express';
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

    const isProduction = process.env.NODE_ENV === 'production';

    // ✅ access token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15, // 15 phút
    });

    // ✅ refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
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
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
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
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as any,
    };
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return { message: 'Logged out' };
  }

  /**
   * Silent Token Refresh
   * FE tự động gọi khi nhận 401 → BE dùng refreshToken cookie để cấp accessToken mới.
   * Áp dụng Refresh Token Rotation: mỗi lần refresh sẽ cấp refreshToken mới.
   */
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Không có refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessToken(refreshToken);

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15, // 15 phút
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
    });

    return { message: 'Token đã được làm mới' };
  }

  @Get('me')
  async me(@CurrentUser() userToken: any) {
    // 1. Phải lấy từ DB để có Name và Avatar (Token không chứa các thông tin này)
    const userProfile = await this.authService.getUserProfile(userToken.sub);

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    let avatarUrl = userProfile.avatar;

    // 2. Chuyển tên file thành URL tuyệt đối nếu không phải là link sẵn (http...)
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      avatarUrl = `${siteUrl}/static/${avatarUrl}`;
    }

    return {
      id: userProfile.user.id,
      email: userProfile.user.email,
      name: userProfile.user.name,
      avatar: avatarUrl,
      role: userProfile.user.role,
      isVerified: userProfile.user.isVerified ?? false,
    };
  }
}
