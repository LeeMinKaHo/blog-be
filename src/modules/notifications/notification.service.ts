import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepo: Repository<Notification>,
    ) { }

    async createNotification(data: {
        recipientId: number;
        senderId: number;
        type: NotificationType;
        targetId: number;
        content: string;
    }) {
        // Không thông báo nếu tự mình làm với mình
        if (data.recipientId === data.senderId) return null;

        const notification = this.notificationRepo.create(data);
        return this.notificationRepo.save(notification);
    }

    async getNotifications(userId: number, page: number = 1, limit: number = 20) {
        const [data, total] = await this.notificationRepo.findAndCount({
            where: { recipientId: userId },
            relations: ['sender'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async markAsRead(id: number, userId: number) {
        await this.notificationRepo.update({ id, recipientId: userId }, { isRead: true });
        return { success: true };
    }

    async markAllAsRead(userId: number) {
        await this.notificationRepo.update({ recipientId: userId }, { isRead: true });
        return { success: true };
    }

    async getUnreadCount(userId: number) {
        const count = await this.notificationRepo.count({
            where: { recipientId: userId, isRead: false },
        });
        return { count };
    }
}
