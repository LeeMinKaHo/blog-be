import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * ┌──────────────────────────────────────────────────────┐
 * │  RedisModule — Centralized Redis Connection          │
 * │                                                      │
 * │  @Global() → Import 1 lần ở AppModule là đủ.        │
 * │  Mọi module khác chỉ cần inject 'REDIS_CLIENT'      │
 * │  mà không cần import RedisModule lại.                │
 * └──────────────────────────────────────────────────────┘
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          // Tự động retry khi mất kết nối, tối đa 3 lần
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
