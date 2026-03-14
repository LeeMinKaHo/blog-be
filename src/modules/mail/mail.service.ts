import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
            url: 'https://foxtek.blog', // Thay bằng link thực tế của bạn
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
}
