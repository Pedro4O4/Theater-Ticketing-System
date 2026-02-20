import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private oauth2Client;
    private emailUser;
    private isConfigured;
    constructor(configService: ConfigService);
    sendVerificationOTP(to: string, otp: string): Promise<void>;
    sendPasswordResetOTP(to: string, otp: string): Promise<void>;
    private sendMail;
}
