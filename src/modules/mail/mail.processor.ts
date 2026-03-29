import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
    constructor(private readonly mailService: MailService) {
        super();
    }

    async process(job: Job) {
        switch (job.name) {
            case 'send-welcome': {
                const { to, name, url } = job.data;
                await this.mailService.sendWelcomeEmail(to, name, url);
                break;
            }
            case 'send-new-post-notification': {
                await this.mailService.sendNewPostEmail(job.data);
                break;
            }
            default:
                console.log(`Unknown job name: ${job.name}`);
        }
    }
}