import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private resend;
    private fromEmail;
    constructor(configService: ConfigService);
    sendVerificationOTP(email: string, otp: string): Promise<{
        success: boolean;
        error: string;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: string;
        error?: undefined;
    }>;
    sendPasswordResetOTP(email: string, otp: string): Promise<{
        success: boolean;
        error: string;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: string;
        error?: undefined;
    }>;
    private sendMail;
    private logOTPTerminal;
}
