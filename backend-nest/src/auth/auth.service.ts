import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PendingRegistration, PendingRegistrationDocument } from './schemas/pending-registration.schema';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
        @InjectModel(PendingRegistration.name)
        private pendingModel: Model<PendingRegistrationDocument>,
    ) { }

    async register(registerDto: any) {
        const { email, password, name, phone } = registerDto;

        // Check if email already exists as a verified user
        const existingUser = await this.usersService.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const hashedPassword = await bcrypt.hash(password, 10);

        // Upsert into pending_registrations (so re-registrations update the OTP)
        await this.pendingModel.findOneAndUpdate(
            { email },
            {
                name,
                email,
                phone: phone || '',
                password: hashedPassword,
                otp,
                otpExpires,
                createdAt: new Date(),
            },
            { upsert: true, new: true },
        );

        // Send verification email
        await this.mailService.sendVerificationOTP(email, otp);

        return {
            message:
                'Registration initiated. Please verify your email with the OTP sent.',
        };
    }

    async verifyRegistration(email: string, otp: string) {
        // First check pending registrations
        const pending = await this.pendingModel.findOne({ email }).exec();
        if (!pending) {
            // Fallback: check if user already exists (for admin-created users or legacy flow)
            const user = await this.usersService.findOneByEmail(email);
            if (!user) {
                throw new NotFoundException('No pending registration found for this email');
            }

            // Legacy flow for existing unverified users
            if (
                !user.otp ||
                user.otp !== otp ||
                !user.otpExpires ||
                user.otpExpires < new Date()
            ) {
                throw new BadRequestException('Invalid or expired OTP');
            }

            user.isVerified = true;
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            return { message: 'Registration completed successfully' };
        }

        // Verify OTP from pending registration
        if (
            !pending.otp ||
            pending.otp !== otp ||
            !pending.otpExpires ||
            pending.otpExpires < new Date()
        ) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // Create the real user in the users collection
        await this.usersService.create({
            name: pending.name,
            email: pending.email,
            phone: pending.phone,
            password: pending.password, // already hashed
            role: UserRole.STANDARD,
            isVerified: true,
        });

        // Remove from pending
        await this.pendingModel.deleteOne({ email });

        return { message: 'Registration completed successfully' };
    }

    async login(loginDto: any) {
        const { email, password } = loginDto;

        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('Email not found');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('Incorrect password');
        }

        // Admin-created users must change password on first login
        if (user.requiresPasswordChange) {
            throw new ForbiddenException({
                message: 'Please set your own password.',
                requiresPasswordChange: true,
                email: email,
            });
        }

        if (!user.isVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();

            await this.mailService.sendVerificationOTP(email, otp);

            throw new ForbiddenException({
                message:
                    'Account not verified. A new verification code has been sent to your email.',
                requiresVerification: true,
            });
        }

        const payload = { sub: user._id, role: user.role };
        const token = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
            },
        };
    }

    async forgetPassword(email: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await this.mailService.sendPasswordResetOTP(email, otp);

        return { message: 'OTP sent to your email.' };
    }

    async resetPassword(resetDto: any) {
        const { email, otp, newPassword } = resetDto;

        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (
            !user.otp ||
            user.otp !== otp ||
            !user.otpExpires ||
            user.otpExpires < new Date()
        ) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return { message: 'Password reset successfully' };
    }

    // Step 1: Admin-created user submits their new password (sends OTP after)
    async submitNewPassword(submitDto: any) {
        const { email, newPassword } = submitDto;

        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.requiresPasswordChange) {
            throw new BadRequestException('User does not require password change');
        }

        user.password = await bcrypt.hash(newPassword, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        this.mailService.sendVerificationOTP(email, otp).catch(err =>
            console.error(`Failed to send verification email to ${email}:`, err.message)
        );

        return {
            message: 'Password saved. Please verify with the OTP sent to your email.',
            email: email,
        };
    }

    // Step 2: Verify OTP and activate account
    async verifyAndActivate(verifyDto: any) {
        const { email, otp } = verifyDto;

        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.requiresPasswordChange) {
            throw new BadRequestException('User does not require activation');
        }

        if (
            !user.otp ||
            user.otp !== otp ||
            !user.otpExpires ||
            user.otpExpires < new Date()
        ) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        user.isVerified = true;
        user.requiresPasswordChange = false;
        await user.save();

        const payload = { sub: user._id, role: user.role };
        const token = this.jwtService.sign(payload);

        return {
            message: 'Account activated successfully!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
            },
        };
    }
}
