import { AppService } from './app.service';
import { MailService } from './mail/mail.service';
export declare class AppController {
    private readonly appService;
    private readonly mailService;
    constructor(appService: AppService, mailService: MailService);
    getHello(): string;
    testEmail(to: string): Promise<string>;
}
