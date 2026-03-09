import { Controller, Get, Post, Param, Query, Put } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from '../users/entity/user.entity';

@Controller('notifications')
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    getNotifications(
        @CurrentUser('sub') userId: number,
        @Query('page') page: number,
        @Query('limit') limit: number,
    ) {
        return this.notificationService.getNotifications(userId, page, limit);
    }

    @Get('unread-count')
    getUnreadCount(@CurrentUser('sub') userId: number) {
        return this.notificationService.getUnreadCount(userId);
    }

    @Put(':id/read')
    markAsRead(@Param('id') id: string, @CurrentUser('sub') userId: number) {
        return this.notificationService.markAsRead(+id, userId);
    }

    @Put('read-all')
    markAllAsRead(@CurrentUser('sub') userId: number) {
        return this.notificationService.markAllAsRead(userId);
    }
}
