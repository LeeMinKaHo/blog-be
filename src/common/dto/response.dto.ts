// src/common/dto/response.dto.ts

/** Unified success response envelope */
export class ResponseDto<T> {
  success: true;
  statusCode: number;
  message: string;
  requestId: string;
  timestamp: string;
  data: T | null;
}

/** Unified error response envelope */
export class ErrorResponseDto {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  requestId: string;
  timestamp: string;
  path: string;
  errors?: any[];
}
