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
import { ClsService } from 'nestjs-cls';
import { REQUEST_ID_KEY } from '../middlewares/request-id.middleware';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  requestId: string;
  timestamp: string;
  path: string;
  errors?: any[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly cls: ClsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = this.cls.get<string>(REQUEST_ID_KEY) ?? '-';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'SYS_001';
    let message = 'Internal server error';
    let errors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse() as any;

      message =
        typeof exRes === 'string'
          ? exRes
          : (exRes.message ?? 'An error occurred');
      errorCode = exRes.errorCode ?? (status >= 500 ? 'SYS_001' : 'COMMON_001');
      errors = exRes.errors;

      if (status >= 500) {
        this.logger.error('HttpException 5xx', {
          context: 'ExceptionFilter',
          requestId,
          statusCode: status,
          errorCode,
          method: request.method,
          url: request.url,
          message,
          stack: (exception as Error).stack,
        });
      } else {
        this.logger.warn('HttpException 4xx', {
          context: 'ExceptionFilter',
          requestId,
          statusCode: status,
          errorCode,
          method: request.method,
          url: request.url,
          message,
        });
      }
    } else {
      // Lỗi không xác định (runtime error)
      this.logger.error('Unhandled Exception', {
        context: 'ExceptionFilter',
        requestId,
        method: request.method,
        url: request.url,
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    // ── Unified error response ───────────────────────────────────────────────
    const body: ErrorResponse = {
      success: false,
      statusCode: status,
      errorCode,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors && { errors }),
    };

    response.status(status).json(body);
  }
}
