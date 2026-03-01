import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PendingRegistrationDocument } from './schemas/pending-registration.schema';
export declare class AuthService {
    private usersService;
    private jwtService;
    private mailService;
    private pendingModel;
    constructor(usersService: UsersService, jwtService: JwtService, mailService: MailService, pendingModel: Model<PendingRegistrationDocument>);
    register(registerDto: any): Promise<{
        message: string;
    }>;
    verifyRegistration(email: string, otp: string): Promise<{
        message: string;
    }>;
    login(loginDto: any): Promise<{
        message: string;
        token: string;
        user: {
            _id: import("mongoose").Types.ObjectId;
            name: string;
            email: string;
            role: string;
            profilePicture: string | undefined;
        };
    }>;
    forgetPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(resetDto: any): Promise<{
        message: string;
    }>;
    submitNewPassword(submitDto: any): Promise<{
        message: string;
        email: any;
    }>;
    verifyAndActivate(verifyDto: any): Promise<{
        message: string;
        token: string;
        user: {
            _id: import("mongoose").Types.ObjectId;
            name: string;
            email: string;
            role: string;
            profilePicture: string | undefined;
        };
    }>;
}
