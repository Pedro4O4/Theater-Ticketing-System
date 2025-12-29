import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

@Injectable()
// Service for sending emails via Mailgun
export class MailService {
  private mailgun: any;
  private domain: string | undefined;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'EventTix';
    const fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@' + this.domain;

    if (apiKey && this.domain) {
      const mailgunClient = new Mailgun(FormData);
      this.mailgun = mailgunClient.client({
        username: 'api',
        key: apiKey,
      });
      this.fromEmail = `${fromName} <${fromEmail}>`;
      console.log(`✅ Mailgun Service: Configured for ${this.domain}`);
    } else {
      console.warn(
        '⚠️  Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env',
      );
    }
  }

  async sendVerificationOTP(to: string, otp: string): Promise<void> {
    const subject = 'Verify Your Account - EventTix';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
        <div style="background: white; padding: 30px; border-radius: 8px;">
          <h1 style="color: #667eea; text-align: center; margin-bottom: 30px;">🎟️ EventTix</h1>
          <h2 style="color: #333; text-align: center;">Account Verification</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for registering! Please use the following OTP to verify your account:
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            This code expires in 10 minutes.
          </p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  async sendPasswordResetOTP(to: string, otp: string): Promise<void> {
    const subject = 'Password Reset Code - EventTix';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px;">
        <div style="background: white; padding: 30px; border-radius: 8px;">
          <h1 style="color: #f5576c; text-align: center; margin-bottom: 30px;">🎟️ EventTix</h1>
          <h2 style="color: #333; text-align: center;">Password Reset</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Use the following code:
          </p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #f5576c; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            This code expires in 10 minutes.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.mailgun) {
      throw new InternalServerErrorException(
        'Email service not configured. Please contact support.',
      );
    }

    console.log(`📧 Sending email to ${to}: ${subject}`);

    try {
      const response = await this.mailgun.messages.create(this.domain, {
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      });

      console.log(`✅ Email sent successfully: ${response.id}`);
    } catch (error: any) {
      console.error('❌ Email sending failed:', error.message);
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }
  }
}
