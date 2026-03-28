import { Inject, Injectable } from "@nestjs/common";
import { Cacheable } from "cacheable";
import Redis from "ioredis";

/** Thời gian sống mặc định cho từng loại cache */
export const CACHE_TTL = {
  PROFILE: '30m',  // Profile người dùng: 30 phút
  STATS: '10m',    // Thống kê hoạt động: 10 phút
} as const;

/** Helper tạo cache key nhất quán, tránh hardcode string */
export const CACHE_KEYS = {
  profile: (userId: number) => `user:${userId}:profile`,
  stats: (userId: number) => `user:${userId}:stats`,
};

@Injectable()
export class CacheService<T = any> {
  constructor(
    @Inject('CACHE_INSTANCE') private readonly cache: Cacheable,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async get(key: string): Promise<T | undefined> {
    return await this.cache.get(key);
  }

  async set(key: string, value: T, ttl?: number | string): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  /**
   * Xóa tất cả cache keys khớp với pattern (dùng Redis SCAN, không block).
   * Ví dụ: deleteByPattern('keyv:user:42:*') sẽ xóa profile + stats của user 42.
   */
  async deleteByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
