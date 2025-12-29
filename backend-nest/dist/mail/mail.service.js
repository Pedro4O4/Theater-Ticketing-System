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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mailgun_js_1 = __importDefault(require("mailgun.js"));
const form_data_1 = __importDefault(require("form-data"));
let MailService = class MailService {
    configService;
    mailgun;
    domain;
    fromEmail;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('MAILGUN_API_KEY');
        this.domain = this.configService.get('MAILGUN_DOMAIN');
        const fromName = this.configService.get('EMAIL_FROM_NAME') || 'EventTix';
        const fromEmail = this.configService.get('EMAIL_FROM') || 'noreply@' + this.domain;
        if (apiKey && this.domain) {
            const mailgunClient = new mailgun_js_1.default(form_data_1.default);
            this.mailgun = mailgunClient.client({
                username: 'api',
                key: apiKey,
            });
            this.fromEmail = `${fromName} <${fromEmail}>`;
            console.log(`✅ Mailgun Service: Configured for ${this.domain}`);
        }
        else {
            console.warn('⚠️  Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env');
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
        if (!this.mailgun) {
            throw new common_1.InternalServerErrorException('Email service not configured. Please contact support.');
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
        }
        catch (error) {
            console.error('❌ Email sending failed:', error.message);
            throw new common_1.InternalServerErrorException(`Failed to send email: ${error.message}`);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map