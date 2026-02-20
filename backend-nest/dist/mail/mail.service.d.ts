import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private config;
    private emailUser;
    private isConfigured;
    private oauth2Client;
    constructor(configService: ConfigService);
    sendVerificationOTP(to: string, otp: string): Promise<void>;
    sendPasswordResetOTP(to: string, otp: string): Promise<void>;
    private sendMail;
}
