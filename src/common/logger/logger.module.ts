import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// ── Format dành cho console (có màu, dễ đọc khi dev) ────────────────────────
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, context, stack, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const extra = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level} ${ctx} ${message} ${extra}${stack ? '\n' + stack : ''}`;
  }),
);

// ── Format dành cho file (JSON, dễ parse bằng ELK / CloudWatch) ──────────────
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
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
