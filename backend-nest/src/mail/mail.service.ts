import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';

@Injectable()
export class MailService {
  private emailUser: string;
  private isConfigured: boolean = false;
  private gmail: gmail_v1.Gmail;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI')?.trim();
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN')?.trim();
    this.emailUser = this.configService.get<string>('EMAIL_USER')?.trim() || '';

    if (clientId && clientSecret && redirectUri && refreshToken && this.emailUser) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      this.isConfigured = true;
      console.log(`✅ Gmail API Service: Configured for ${this.emailUser}`);
    } else {
      const missing = [];
      if (!clientId) missing.push('GOOGLE_CLIENT_ID');
      if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
      if (!redirectUri) missing.push('GOOGLE_REDIRECT_URI');
      if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');
      if (!this.emailUser) missing.push('EMAIL_USER');

      console.error(
        `❌ Gmail API not configured properly. Missing variables: ${missing.join(', ')}`,
      );
    }
  }

  async sendVerificationOTP(to: string, otp: string): Promise<void> {
    const subject = 'Your EventTix Verification Code: ' + otp;
    const otpDigits = otp.split('').map(d =>
      `<td style="padding:0 6px;"><div style="width:52px;height:64px;line-height:64px;background:#f0f2ff;border:2px solid #667eea;border-radius:12px;font-size:32px;font-weight:800;color:#667eea;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">${d}</div></td>`
    ).join('');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Verify your account</title></head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:13px;font-weight:600;letter-spacing:4px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:8px;">Welcome to</div>
          <div style="font-size:36px;font-weight:800;color:#ffffff;letter-spacing:2px;">EventTix</div>
          <div style="width:48px;height:3px;background:rgba(255,255,255,0.5);margin:14px auto 0;border-radius:2px;"></div>
        </td></tr>

        <!-- Body card -->
        <tr><td style="background:#ffffff;padding:44px 48px 36px;">
          <div style="width:64px;height:64px;background:#f0f2ff;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:64px;font-size:28px;">✉️</div>
          <h2 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;color:#1a1a2e;">Verify Your Account</h2>
          <p style="margin:0 0 28px;text-align:center;font-size:15px;color:#6b7280;line-height:1.7;">
            Thanks for signing up! Enter the code below in the app to complete your registration.
          </p>

          <!-- OTP digits -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>${otpDigits}</tr>
          </table>

          <!-- Timer badge -->
          <div style="text-align:center;margin-bottom:32px;">
            <span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-size:13px;font-weight:600;padding:7px 18px;border-radius:20px;">
              ⏱ Expires in <strong>10 minutes</strong>
            </span>
          </div>

          <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px;">

          <!-- Security notice -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;padding-top:2px;font-size:20px;">🔒</td>
              <td style="font-size:13px;color:#9ca3af;line-height:1.7;">
                <strong style="color:#6b7280;">Never share this code.</strong> EventTix staff will never ask for your OTP.
                If you didn't create an account, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.8;">
            © ${new Date().getFullYear()} EventTix. All rights reserved.<br>
            This is an automated message — please do not reply.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;
    const text = `EventTix - Account Verification\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not create an account, you can safely ignore this email.`;

    await this.sendMail(to, subject, html, text);
  }

  async sendPasswordResetOTP(to: string, otp: string): Promise<void> {
    const subject = 'Your EventTix Password Reset Code: ' + otp;
    const otpDigits = otp.split('').map(d =>
      `<td style="padding:0 6px;"><div style="width:52px;height:64px;line-height:64px;background:#fff0f3;border:2px solid #f5576c;border-radius:12px;font-size:32px;font-weight:800;color:#f5576c;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">${d}</div></td>`
    ).join('');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:13px;font-weight:600;letter-spacing:4px;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:8px;">Security alert from</div>
          <div style="font-size:36px;font-weight:800;color:#ffffff;letter-spacing:2px;">EventTix</div>
          <div style="width:48px;height:3px;background:rgba(255,255,255,0.5);margin:14px auto 0;border-radius:2px;"></div>
        </td></tr>

        <!-- Body card -->
        <tr><td style="background:#ffffff;padding:44px 48px 36px;">
          <div style="width:64px;height:64px;background:#fff0f3;border-radius:50%;margin:0 auto 24px;text-align:center;line-height:64px;font-size:28px;">🔑</div>
          <h2 style="margin:0 0 10px;text-align:center;font-size:24px;font-weight:700;color:#1a1a2e;">Password Reset</h2>
          <p style="margin:0 0 28px;text-align:center;font-size:15px;color:#6b7280;line-height:1.7;">
            We received a request to reset your password. Use the code below to continue. If this wasn't you, ignore this email.
          </p>

          <!-- OTP digits -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>${otpDigits}</tr>
          </table>

          <!-- Timer badge -->
          <div style="text-align:center;margin-bottom:32px;">
            <span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-size:13px;font-weight:600;padding:7px 18px;border-radius:20px;">
              ⏱ Expires in <strong>10 minutes</strong>
            </span>
          </div>

          <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px;">

          <!-- Security notice -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;padding-top:2px;font-size:20px;">⚠️</td>
              <td style="font-size:13px;color:#9ca3af;line-height:1.7;">
                <strong style="color:#6b7280;">Never share this code.</strong> EventTix staff will never ask for your OTP.
                If you did not request a password reset, please secure your account immediately.
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.8;">
            © ${new Date().getFullYear()} EventTix. All rights reserved.<br>
            This is an automated message — please do not reply.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;
    const text = `EventTix - Password Reset\n\nYour password reset code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not request a password reset, you can safely ignore this email.`;

    await this.sendMail(to, subject, html, text);
  }

  private async sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.isConfigured || !this.gmail) {
      const errorMsg = 'Email service not configured (check GOOGLE_* and EMAIL_USER env vars).';
      console.error(`❌ ${errorMsg}`);
      throw new InternalServerErrorException(errorMsg);
    }

    console.log(`📧 Attempting to send email to ${to}: ${subject}`);

    try {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@eventtix.app>`;
      const date = new Date().toUTCString();

      // Build RFC 2822 multipart/alternative message (plain text + HTML)
      // Multipart format prevents spam filters from flagging HTML-only emails
      const messageParts = [
        `From: EventTix <${this.emailUser}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Date: ${date}`,
        `Message-ID: ${messageId}`,
        `Reply-To: no-reply@eventtix.app`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        html,
        '',
        `--${boundary}--`,
      ];
      const message = messageParts.join('\r\n');

      // Base64url encode the message
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('✉️ Sending via Gmail API...');
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log(`✅ Email sent successfully: ${result.data.id}`);
    } catch (error: any) {
      console.error('❌ Email sending failed:', error);
      if (error.response?.data) {
        console.error('API Error details:', JSON.stringify(error.response.data));
      }
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message || 'Unknown error'}`,
      );
    }
  }


}
