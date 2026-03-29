import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cacheable } from 'cacheable';
import { createKeyv } from '@keyv/redis';
import { CacheService } from './cache.service';

/**
 * CacheModule — Quản lý caching với Cacheable + Redis
 *
 * - CACHE_INSTANCE: Dùng `cacheable` lib (hỗ trợ in-memory + Redis tiered cache)
 * - REDIS_CLIENT:   Dùng lại từ RedisModule (@Global) — không tạo kết nối mới!
 */
@Module({
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const secondary = createKeyv(`redis://${host}:${port}`, {
          namespace: 'keyv',
        });
        return new Cacheable({ secondary, ttl: '4h' });
      },
    },
    CacheService,
  ],
  // Không export 'REDIS_CLIENT' ở đây nữa — nó đã được export từ RedisModule (@Global)
  exports: ['CACHE_INSTANCE', CacheService],
})
export class CacheModule {}
