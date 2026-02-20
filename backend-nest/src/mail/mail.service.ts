import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private emailUser: string;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    this.emailUser = this.configService.get<string>('EMAIL_USER') || '';

    if (clientId && clientSecret && redirectUri && refreshToken && this.emailUser) {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      this.isConfigured = true;
      console.log(`✅ Gmail OAuth2 Service: Configured for ${this.emailUser}`);
    } else {
      console.warn(
        '⚠️  Gmail API not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN, and EMAIL_USER in .env',
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

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'Email service not configured. Please contact support.',
      );
    }

    console.log(`📧 Sending email to ${to}: ${subject}`);

    try {
      // Get a fresh access token using the refresh token
      const { token: accessToken } = await this.oauth2Client.getAccessToken();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.emailUser,
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GOOGLE_REFRESH_TOKEN'),
          accessToken: accessToken as string,
        },
      });

      const info = await transporter.sendMail({
        from: `EventTix <${this.emailUser}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent successfully: ${info.messageId}`);
    } catch (error: any) {
      console.error('❌ Email sending failed:', error.message);
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }
  }
}
