import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private transporter;
    private fromEmail;
    constructor(configService: ConfigService);
    sendVerificationOTP(email: string, otp: string): Promise<{
        success: boolean;
        error: string;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: any;
        error?: undefined;
    }>;
    sendPasswordResetOTP(email: string, otp: string): Promise<{
        success: boolean;
        error: string;
        messageId?: undefined;
    } | {
        success: boolean;
        messageId: any;
        error?: undefined;
    }>;
    private sendMail;
    private logOTPTerminal;
}
