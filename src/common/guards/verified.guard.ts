import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFIED_KEY } from '../decorators/require-verified.decorator';

/**
 * Guard kiểm tra tài khoản đã xác thực email.
 * Áp dụng cho các route có decorator @RequireVerified().
 * JWT payload phải có isVerified: true (được set khi generateTokens).
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requireVerified = this.reflector.getAllAndOverride<boolean>(
            REQUIRE_VERIFIED_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Route không yêu cầu xác thực thì cho qua
        if (!requireVerified) return true;

        const request = context.switchToHttp().getRequest();
        const user = request['user'];

        if (!user?.isVerified) {
            throw new ForbiddenException(
                'Bạn cần xác thực email trước khi thực hiện hành động này. Vui lòng kiểm tra hộp thư!',
            );
        }

        return true;
    }
}
