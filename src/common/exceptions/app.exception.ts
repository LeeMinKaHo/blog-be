// src/common/exceptions/app.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../errors/error-code.enum";

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    errorCode: ErrorCode,
    errors?: any[]
  ) {
    super(
      {
        statusCode: status,
        message,
        errorCode,
        errors,
      },
      status
    );
  }
}
