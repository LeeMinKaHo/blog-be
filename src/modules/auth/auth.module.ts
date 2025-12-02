import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from '../users/user.module';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    CacheModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
