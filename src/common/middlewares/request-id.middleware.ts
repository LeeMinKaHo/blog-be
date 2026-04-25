import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_KEY = 'requestId';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Ưu tiên header từ client (load balancer, API gateway) — nếu không có thì tự sinh
    const requestId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      uuidv4();

    // Gán vào CLS để mọi service trong cùng request đều đọc được
    this.cls.set(REQUEST_ID_KEY, requestId);

    // Trả về header cho client (hữu ích khi debug)
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
