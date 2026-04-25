// src/common/interceptors/response.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { REQUEST_ID_KEY } from '../middlewares/request-id.middleware';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  requestId: string;
  timestamp: string;
  data: T | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const requestId = this.cls.get<string>(REQUEST_ID_KEY) ?? '-';

    return next.handle().pipe(
      map((data: any) => {
        // Nếu controller trả về object có { message, data } thì dùng message đó
        let message = 'Success';
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = data.message;
          responseData = data.data;
        }

        return {
          success: true as const,
          statusCode: context.switchToHttp().getResponse().statusCode,
          message,
          requestId,
          timestamp: new Date().toISOString(),
          data: responseData ?? null,
        };
      }),
    );
  }
}
