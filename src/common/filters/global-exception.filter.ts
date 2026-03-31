// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Request, Response } from 'express';
import { Logger } from 'winston';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let resBody: any = {
      statusCode: status,
      message: 'Internal server error',
      errorCode: 'SYS_001',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse() as any;

      resBody = {
        statusCode: status,
        message: exRes.message ?? exRes,
        errorCode: exRes.errorCode ?? 'COMMON_001',
        errors: exRes.errors,
      };

      // 4xx → warn, 5xx → error
      if (status >= 500) {
        this.logger.error('HttpException 5xx', {
          context: 'ExceptionFilter',
          statusCode: status,
          method: request.method,
          url: request.url,
          message: resBody.message,
          stack: (exception as Error).stack,
        });
      } else {
        this.logger.warn('HttpException 4xx', {
          context: 'ExceptionFilter',
          statusCode: status,
          method: request.method,
          url: request.url,
          message: resBody.message,
        });
      }
    } else {
      // Lỗi không xác định (runtime error)
      this.logger.error('Unhandled Exception', {
        context: 'ExceptionFilter',
        method: request.method,
        url: request.url,
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    response.status(status).json({
      ...resBody,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
