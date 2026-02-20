"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
let MailService = class MailService {
    configService;
    emailUser;
    isConfigured = false;
    gmail;
    constructor(configService) {
        this.configService = configService;
        const clientId = this.configService.get('GOOGLE_CLIENT_ID')?.trim();
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET')?.trim();
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI')?.trim();
        const refreshToken = this.configService.get('GOOGLE_REFRESH_TOKEN')?.trim();
        this.emailUser = this.configService.get('EMAIL_USER')?.trim() || '';
        if (clientId && clientSecret && redirectUri && refreshToken && this.emailUser) {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            this.gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
            this.isConfigured = true;
            console.log(`✅ Gmail API Service: Configured for ${this.emailUser}`);
        }
        else {
            const missing = [];
            if (!clientId)
                missing.push('GOOGLE_CLIENT_ID');
            if (!clientSecret)
                missing.push('GOOGLE_CLIENT_SECRET');
            if (!redirectUri)
                missing.push('GOOGLE_REDIRECT_URI');
            if (!refreshToken)
                missing.push('GOOGLE_REFRESH_TOKEN');
            if (!this.emailUser)
                missing.push('EMAIL_USER');
            console.error(`❌ Gmail API not configured properly. Missing variables: ${missing.join(', ')}`);
        }
    }
    async sendVerificationOTP(to, otp) {
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
    async sendPasswordResetOTP(to, otp) {
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
    async sendMail(to, subject, html) {
        if (!this.isConfigured || !this.gmail) {
            const errorMsg = 'Email service not configured (check GOOGLE_* and EMAIL_USER env vars).';
            console.error(`❌ ${errorMsg}`);
            throw new common_1.InternalServerErrorException(errorMsg);
        }
        console.log(`📧 Attempting to send email to ${to}: ${subject}`);
        try {
            const messageParts = [
                `From: EventTix <${this.emailUser}>`,
                `To: ${to}`,
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                '',
                html,
            ];
            const message = messageParts.join('\r\n');
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
        }
        catch (error) {
            console.error('❌ Email sending failed:', error);
            if (error.response?.data) {
                console.error('API Error details:', JSON.stringify(error.response.data));
            }
            throw new common_1.InternalServerErrorException(`Failed to send email: ${error.message || 'Unknown error'}`);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map