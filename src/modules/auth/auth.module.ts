import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from '../users/user.module';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    CacheModule,
    MailModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule { }
