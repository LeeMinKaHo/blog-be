import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { SignUpDto } from './dto/sign-up.dto';
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

    // 👉 FE KHÔNG cần token
    return {
      id: user.id,
      email: user.email,
      name: user.name,
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
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
