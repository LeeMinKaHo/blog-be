import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

/**
 * @deprecated Dùng GlobalExceptionFilter thay thế.
 * File này giữ lại để tránh lỗi import ở những nơi còn reference.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message || exception.message
        : exception.message || 'Internal server error';

    const body: ErrorResponseDto = {
      success: false,
      statusCode: status,
      errorCode: 'COMMON_001',
      message,
      requestId: '-',
      timestamp: new Date().toISOString(),
      path: request?.url ?? '/',
    };

    response.status(status).json(body);
  }
}
