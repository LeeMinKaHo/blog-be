import { Module } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { createKeyv } from '@keyv/redis';
import { CacheService } from './cache.service';
import Redis from 'ioredis';

@Module({
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      useFactory: () => {
        // If no namespace is set, the default is 'keyv', and keys are prefixed with 'keyv:'.
        const secondary = createKeyv('redis://localhost:6379', {
          namespace: 'keyv',
        });
        return new Cacheable({ secondary, ttl: '4h' });
      },
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: 'localhost',
          port: 6379,
        });
      },
    },
    CacheService
  ],
  exports: ['CACHE_INSTANCE', 'REDIS_CLIENT', CacheService],
})
export class CacheModule {}
