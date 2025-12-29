import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-email')
  async testEmail(@Query('to') to: string) {
    if (!to) return 'Please provide ?to=email@example.com';
    try {
      await this.mailService.sendVerificationOTP(to, '123456');
      return `✅ Email sent successfully to ${to}`;
    } catch (error: any) {
      return `❌ Error: ${error.message}`;
    }
  }
}
