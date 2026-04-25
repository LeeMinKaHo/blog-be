// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ClsService } from 'nestjs-cls';
import { REQUEST_ID_KEY } from '../../common/middlewares/request-id.middleware';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly cls: ClsService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check — kiểm tra trạng thái hệ thống' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  @ApiResponse({ status: 503, description: 'Một hoặc nhiều service không khả dụng' })
  async check() {
    const result = await this.health.check([
      // 1. Kiểm tra kết nối database
      () => this.db.pingCheck('database'),

      // 2. RSS memory không vượt quá 512 MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),

      // 3. Heap không vượt quá 300 MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // 4. Disk usage dưới 90%
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);

    const mem = process.memoryUsage();

    return {
      ...result,
      meta: {
        requestId: this.cls.get<string>(REQUEST_ID_KEY) ?? '-',
        uptime: Math.floor(process.uptime()),
        uptimeHuman: formatUptime(process.uptime()),
        environment: process.env.NODE_ENV ?? 'development',
        nodeVersion: process.version,
        memoryUsage: {
          rss: formatBytes(mem.rss),
          heapUsed: formatBytes(mem.heapUsed),
          heapTotal: formatBytes(mem.heapTotal),
        },
      },
    };
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
