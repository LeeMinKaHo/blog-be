import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppException } from './common/exceptions/app.exception';
import { ErrorCode } from './common/errors/error-code.enum';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Tắt logger mặc định của NestJS, sẽ dùng Winston thay thế
    bufferLogs: true,
  });

  // ── Dùng Winston làm NestJS Logger mặc định ───────────────────────────────
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(cookieParser());

  // ── Swagger: chỉ bật trên môi trường development ─────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Foxtek Blog API')
      .setDescription(
        `## 🚀 Backend API cho nền tảng Foxtek Blog\n\n` +
        `RESTful API xây dựng với **NestJS 11**, cung cấp đầy đủ tính năng:\n` +
        `- 🔐 Authentication (JWT + HttpOnly Cookie + Refresh Token Rotation)\n` +
        `- 📝 Blog CRUD với Rich Content\n` +
        `- 👥 Social Features (Follow, Like, Save, Comment)\n` +
        `- 🔔 Real-time Notifications (Socket.io)\n` +
        `- 📧 Email Queue (BullMQ)\n\n` +
        `**Auth:** API sử dụng JWT token lưu trong HttpOnly Cookie. Các endpoint yêu cầu xác thực sẽ được đánh dấu 🔒.`,
      )
      .setVersion('1.0.0')
      .setContact('Foxtek Team', '', 'foxtek@example.com')
      .setLicense('MIT', '')
      .addCookieAuth('accessToken', {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'JWT Access Token (HttpOnly Cookie, tự động gửi kèm request)',
      })
      .addTag('Auth', 'Đăng ký, đăng nhập, refresh token, xác thực email')
      .addTag('Blogs', 'CRUD bài viết, tìm kiếm, trending, phân trang')
      .addTag('Blog Interactions', 'Like, save, view tracking bài viết')
      .addTag('Users', 'Profile, follow system, thống kê user')
      .addTag('Comments', 'Bình luận bài viết, reply, like comment')
      .addTag('Notifications', 'Thông báo real-time, đánh dấu đã đọc')
      .addTag('Files', 'Upload ảnh, quản lý file')
      .addTag('Admin', 'Quản trị hệ thống (yêu cầu quyền Admin)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'Foxtek Blog API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    });
  }

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // ── Global Exception Filter (dùng Winston, phải lấy từ DI) ───────────────
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  // ── Interceptors ──────────────────────────────────────────────────────────
  // Dùng app.get() vì cả hai đều cần ClsService từ DI container
  app.useGlobalInterceptors(
    app.get(HttpLoggingInterceptor),
    app.get(ResponseInterceptor),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        return new AppException(
          'Validation failed',
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
          errors.map((e) => ({
            field: e.property,
            message: Object.values(e.constraints ?? {}).join(', '),
          })),
        );
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // ── Startup log ──────────────────────────────────────────────────────────────
  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  logger.info('\uD83D\uDE80 Foxtek Blog API started', {
    context: 'Bootstrap',
    port,
    environment: process.env.NODE_ENV ?? 'development',
    swagger: process.env.NODE_ENV !== 'production' ? `http://localhost:${port}/api` : 'disabled',
    health: `http://localhost:${port}/health`,
    pid: process.pid,
  });
}
bootstrap();
