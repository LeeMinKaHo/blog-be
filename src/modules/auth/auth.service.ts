import {  Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CacheService } from '../cache/cache.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) {}
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async signIn(loginDto: LoginDto): Promise<any> {
    const { email, password} = loginDto;
    const user = await this.usersService.findOneWithPassword(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    // Tạo token
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Lưu refresh token vào Redis hoặc DB
    await this.cacheService.set(
      `refresh_token_${user.id}`,
      refreshToken,
      7 * 24 * 3600,
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async signOut(uuid: string): Promise<void> {
    const user = await this.usersService.findOneByUuid(uuid);
    if (user) {
      await this.cacheService.delete(`auth_token_${user.id}`);
    }
    return;
  }
}
