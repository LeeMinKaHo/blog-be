import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { join } from 'path';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppException } from './common/exceptions/app.exception';
import { ErrorCode } from './common/errors/error-code.enum';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    console.log(`📄 Swagger: http://localhost:${process.env.PORT ?? 3000}/api`);
  }

  // ── CORS: đọc từ biến môi trường, không hardcode localhost ───────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
