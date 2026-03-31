import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API Health Check' })
  @ApiResponse({ status: 200, description: 'API is alive and kicking' })
  getHello() {
    return {
      status: 'success',
      message: 'Foxtek Blog API is running',
      timestamp: new Date().toISOString(),
    };
  }
}
