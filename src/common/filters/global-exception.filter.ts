// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 🔥 Log lỗi để debug
    console.error('❌ Exception caught:', exception);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let resBody: any = {
      statusCode: status,
      message: "Internal server error",
      errorCode: "SYS_001",
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse() as any;

      resBody = {
        statusCode: status,
        message: exRes.message ?? exRes,
        errorCode: exRes.errorCode ?? "COMMON_001",
        errors: exRes.errors,
      };
    }

    response.status(status).json({
      ...resBody,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
