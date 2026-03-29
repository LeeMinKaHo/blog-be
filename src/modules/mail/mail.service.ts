import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface NewPostJobData {
    to: string;
    recipientName: string;
    authorName: string;
    authorInitial: string;
    title: string;
    description: string;
    thumbnail?: string;
    category?: string;
    postUrl: string;
    siteUrl: string;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        private readonly mailerService: MailerService,
        @InjectQueue('email-queue')
        private emailQueue: Queue,
    ) { }

    /**
     * Đẩy yêu cầu gửi mail Welcome vào hàng đợi
     */
    async queueWelcomeEmail(to: string, name: string): Promise<void> {
        await this.emailQueue.add('send-welcome', {
            to,
            name,
            url: 'https://foxtek.blog',
        });
        this.logger.log(`📥 Đã thêm email welcome cho ${to} vào hàng đợi`);
    }

    /**
     * Thực hiện gửi mail Welcome (Được gọi bởi Worker)
     */
    async sendWelcomeEmail(to: string, name: string, url: string): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: 'Chào mừng bạn đến với Foxtek Blog! 🚀',
                template: 'welcome',
                context: { name, url },
            });
            this.logger.log(`✅ Đã gửi email welcome thành công đến ${to}`);
        } catch (error) {
            this.logger.error(`❌ Gửi email welcome thất bại đến ${to}:`, error);
        }
    }

    /**
     * Gửi mã OTP xác thực tài khoản
     */
    async sendVerificationCode(
        to: string,
        name: string,
        code: string,
    ): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: `[Foxtek Blog] Mã xác thực tài khoản: ${code}`,
                template: 'verification',
                context: {
                    name,
                    code,
                },
            });
            this.logger.log(`✅ Đã gửi email xác thực đến ${to}`);
        } catch (error) {
            this.logger.error(`❌ Gửi email thất bại đến ${to}:`, error);
            throw error;
        }
    }

    /**
     * Đẩy job thông báo bài viết mới vào hàng đợi cho TẤT CẢ followers.
     * Mỗi follower là 1 job riêng để xử lý song song, không block API.
     */
    async queueNewPostNotification(followers: NewPostJobData[]): Promise<void> {
        const jobs = followers.map((data) => ({
            name: 'send-new-post-notification',
            data,
        }));

        await this.emailQueue.addBulk(jobs);
        this.logger.log(`📥 Đã thêm ${jobs.length} email thông báo bài viết mới vào hàng đợi`);
    }

    /**
     * Thực sự gửi email thông báo bài viết mới (được gọi bởi BullMQ Worker)
     */
    async sendNewPostEmail(data: NewPostJobData): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to: data.to,
                subject: `📰 ${data.authorName} vừa đăng bài: "${data.title}"`,
                template: 'new-post',
                context: data,
            });
            this.logger.log(`✅ Đã gửi email bài mới đến ${data.to}`);
        } catch (error) {
            this.logger.error(`❌ Gửi email bài mới thất bại đến ${data.to}:`, error);
            throw error; // re-throw để BullMQ retry
        }
    }
}

