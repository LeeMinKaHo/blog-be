import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserContextService } from '../services/user-context.service';


@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private userContextService: UserContextService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // ✅ Cho phép static files
    if (request.url?.startsWith('/static')) {
      return true;
    }

    const token = this.extractTokenFromRequest(request);

    // ✅ KHÔNG có token → 401 (KHÔNG crash)
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // ✅ Gắn user vào request cho controller dùng
      request['user'] = payload;

      // ✅ Lưu userId vào context cho audit tracking
      const userId = payload.sub || payload.userId; // JWT uses 'sub' for user ID
      console.log('🔑 AuthGuard - JWT payload:', payload, 'userId:', userId);
      if (userId) {
        this.userContextService.setUserId(userId);
        console.log('✅ Set userId to context:', userId);
      }

      return true;
    } catch (err) {
      // ❗ JWT sai / hết hạn → 401
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    // ✅ cookies có thể undefined
    if (!request?.cookies) return null;

    const token = request.cookies['accessToken'];
    return token ?? null;
  }
}
