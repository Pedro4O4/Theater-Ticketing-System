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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("../users/schemas/user.schema");
let AuthService = class AuthService {
    usersService;
    jwtService;
    mailService;
    constructor(usersService, jwtService, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async register(registerDto) {
        const { email, password, name } = registerDto;
        const role = user_schema_1.UserRole.STANDARD;
        const existingUser = await this.usersService.findOneByEmail(email);
        if (existingUser) {
            throw new common_1.ConflictException('User already exists');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await this.usersService.create({
            name,
            email,
            password: hashedPassword,
            role,
            otp,
            otpExpires,
            isVerified: false,
        });
        await this.mailService.sendVerificationOTP(email, otp);
        return {
            message: 'Registration initiated. Please verify your email with the OTP sent.',
        };
    }
    async verifyRegistration(email, otp) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.otp ||
            user.otp !== otp ||
            !user.otpExpires ||
            user.otpExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        return { message: 'Registration completed successfully' };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('Email not found');
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Incorrect password');
        }
        if (user.requiresPasswordChange) {
            throw new common_1.ForbiddenException({
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
            throw new common_1.ForbiddenException({
                message: 'Account not verified. A new verification code has been sent to your email.',
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
    async forgetPassword(email) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
        await this.mailService.sendPasswordResetOTP(email, otp);
        return { message: 'OTP sent to your email.' };
    }
    async resetPassword(resetDto) {
        const { email, otp, newPassword } = resetDto;
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.otp ||
            user.otp !== otp ||
            !user.otpExpires ||
            user.otpExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        return { message: 'Password reset successfully' };
    }
    async submitNewPassword(submitDto) {
        const { email, newPassword } = submitDto;
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.requiresPasswordChange) {
            throw new common_1.BadRequestException('User does not require password change');
        }
        user.password = await bcrypt.hash(newPassword, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
        this.mailService.sendVerificationOTP(email, otp).catch(err => console.error(`Failed to send verification email to ${email}:`, err.message));
        return {
            message: 'Password saved. Please verify with the OTP sent to your email.',
            email: email,
        };
    }
    async verifyAndActivate(verifyDto) {
        const { email, otp } = verifyDto;
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.requiresPasswordChange) {
            throw new common_1.BadRequestException('User does not require activation');
        }
        if (!user.otp ||
            user.otp !== otp ||
            !user.otpExpires ||
            user.otpExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map