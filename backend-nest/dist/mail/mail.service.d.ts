import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    sendVerificationOTP(email: string, otp: string): Promise<{
        success: boolean;
        messageId: any;
    }>;
    sendPasswordResetOTP(email: string, otp: string): Promise<{
        success: boolean;
        messageId: any;
    }>;
    private sendMail;
    private logOTPTerminal;
}
