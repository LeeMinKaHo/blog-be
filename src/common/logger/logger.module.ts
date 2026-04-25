import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import { ClsServiceManager } from 'nestjs-cls';
import { REQUEST_ID_KEY } from '../middlewares/request-id.middleware';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Custom Winston format: tự động inject requestId từ CLS store vào mỗi log entry.
 * ClsServiceManager.getClsService() là static accessor — hoạt động trong mọi async context.
 * Ngoài HTTP context (cron, bootstrap...) thì requestId sẽ không có, log bình thường.
 */
const withRequestId = winston.format((info) => {
  try {
    const requestId = ClsServiceManager.getClsService()?.get<string>(REQUEST_ID_KEY);
    if (requestId) info.requestId = requestId;
  } catch {
    // ngoài CLS context → bỏ qua
  }
  return info;
});

// ── Format dành cho console (có màu, dễ đọc khi dev) ────────────────────────
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  withRequestId(),
  printf(({ timestamp, level, message, context, requestId, stack, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const rid = requestId ? ` rid:${requestId}` : '';
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level} ${ctx}${rid} ${message}${extra}${stack ? '\n' + stack : ''}`;
  }),
);

// ── Format dành cho file (JSON, dễ parse bằng ELK / Grafana Loki / CloudWatch)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  withRequestId(),
  json(),
);

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // 1. Console — dev & production đều in
        new winston.transports.Console({
          format: consoleFormat,
        }),

        // 2. File: tất cả log từ mức info trở lên
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'app.log'),
          format: fileFormat,
          maxsize: 10 * 1024 * 1024, // 10 MB mỗi file
          maxFiles: 7,               // giữ tối đa 7 file (7 ngày)
          tailable: true,
        }),

        // 3. File riêng chỉ chứa lỗi (level error)
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 30,
          tailable: true,
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
