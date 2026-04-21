import { Controller, Get, Post, Param, Query, Put } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from '../users/entity/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách thông báo', description: 'Trả về thông báo của user hiện tại, hỗ trợ phân trang.' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiResponse({ status: 200, description: 'Danh sách thông báo (phân trang).' })
    getNotifications(
        @CurrentUser('sub') userId: number,
        @Query('page') page: number,
        @Query('limit') limit: number,
    ) {
        return this.notificationService.getNotifications(userId, page, limit);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Đếm số thông báo chưa đọc', description: 'Trả về số lượng thông báo chưa đọc để hiển thị badge.' })
    @ApiResponse({ status: 200, description: 'Số thông báo chưa đọc.' })
    getUnreadCount(@CurrentUser('sub') userId: number) {
        return this.notificationService.getUnreadCount(userId);
    }

    @Put(':id/read')
    @ApiOperation({ summary: 'Đánh dấu đã đọc', description: 'Đánh dấu một thông báo cụ thể là đã đọc.' })
    @ApiParam({ name: 'id', description: 'ID thông báo', example: 1 })
    @ApiResponse({ status: 200, description: 'Thông báo đã được đánh dấu đã đọc.' })
    markAsRead(@Param('id') id: string, @CurrentUser('sub') userId: number) {
        return this.notificationService.markAsRead(+id, userId);
    }

    @Put('read-all')
    @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc', description: 'Đánh dấu toàn bộ thông báo của user hiện tại là đã đọc.' })
    @ApiResponse({ status: 200, description: 'Tất cả thông báo đã được đánh dấu đã đọc.' })
    markAllAsRead(@CurrentUser('sub') userId: number) {
        return this.notificationService.markAllAsRead(userId);
    }
}
