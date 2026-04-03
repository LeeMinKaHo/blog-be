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
        const url = config.get<string>('REDIS_URL');
        if (url) return new Redis(url, { maxRetriesPerRequest: 3 });

        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          username: config.get<string>('REDIS_USER', 'default'),
          password: config.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
