import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { Logger } from 'winston';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { REQUEST_ID_KEY } from '../middlewares/request-id.middleware';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly cls: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const requestId = this.cls.get<string>(REQUEST_ID_KEY) ?? '-';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.http('HTTP Request', {
            context: 'HTTP',
            requestId,
            method,
            url: originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip,
            userAgent,
          });
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.error('HTTP Request Error', {
            context: 'HTTP',
            requestId,
            method,
            url: originalUrl,
            statusCode: err?.status ?? 500,
            duration: `${duration}ms`,
            ip,
            userAgent,
            error: err?.message,
          });
        },
      }),
    );
  }
}
