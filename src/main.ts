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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
      .setTitle('Blog API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // ── Global Exception Filter (dùng Winston, phải lấy từ DI) ───────────────
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  // ── Interceptors ──────────────────────────────────────────────────────────
  app.useGlobalInterceptors(
    app.get(HttpLoggingInterceptor),
    new ResponseInterceptor(),
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
}
bootstrap();
