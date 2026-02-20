"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const nodemailer = __importStar(require("nodemailer"));
let MailService = class MailService {
    configService;
    oauth2Client;
    emailUser;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI');
        const refreshToken = this.configService.get('GOOGLE_REFRESH_TOKEN');
        this.emailUser = this.configService.get('EMAIL_USER') || '';
        if (clientId && clientSecret && redirectUri && refreshToken && this.emailUser) {
            this.oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
            this.isConfigured = true;
            console.log(`✅ Gmail OAuth2 Service: Configured for ${this.emailUser}`);
        }
        else {
            console.warn('⚠️  Gmail API not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_REFRESH_TOKEN, and EMAIL_USER in .env');
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
        if (!this.isConfigured) {
            throw new common_1.InternalServerErrorException('Email service not configured. Please contact support.');
        }
        console.log(`📧 Sending email to ${to}: ${subject}`);
        try {
            const { token: accessToken } = await this.oauth2Client.getAccessToken();
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: this.emailUser,
                    clientId: this.configService.get('GOOGLE_CLIENT_ID'),
                    clientSecret: this.configService.get('GOOGLE_CLIENT_SECRET'),
                    refreshToken: this.configService.get('GOOGLE_REFRESH_TOKEN'),
                    accessToken: accessToken,
                },
            });
            const info = await transporter.sendMail({
                from: `EventTix <${this.emailUser}>`,
                to,
                subject,
                html,
            });
            console.log(`✅ Email sent successfully: ${info.messageId}`);
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