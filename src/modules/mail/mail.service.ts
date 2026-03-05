import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly mailerService: MailerService) { }

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
