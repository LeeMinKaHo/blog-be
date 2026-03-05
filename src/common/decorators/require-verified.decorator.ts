import { SetMetadata } from '@nestjs/common';

export const REQUIRE_VERIFIED_KEY = 'requireVerified';

/** Đánh dấu route yêu cầu tài khoản đã xác thực email */
export const RequireVerified = () => SetMetadata(REQUIRE_VERIFIED_KEY, true);
