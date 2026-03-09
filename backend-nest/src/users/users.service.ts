import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async create(user: Partial<User>): Promise<UserDocument> {
        const newUser = new this.userModel(user);
        return newUser.save();
    }

    async findOneByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async findOneByUsername(username: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ username }).exec();
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async findAll(): Promise<UserDocument[]> {
        return this.userModel.find().select('-password').exec();
    }

    async updateRole(id: string, role: string): Promise<UserDocument> {
        const user = await this.userModel
            .findByIdAndUpdate(id, { role }, { new: true, runValidators: true })
            .select('-password')
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async delete(id: string): Promise<void> {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException('User not found');
        }
    }

    async updateProfile(id: string, updateDto: any): Promise<UserDocument> {
        const { name, email, phone, profilePicture, instapayNumber, instapayQR } = updateDto;

        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (email && email !== user.email) {
            const existingUser = await this.userModel.findOne({ email }).exec();
            if (existingUser) {
                throw new BadRequestException('Email already in use');
            }
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone !== undefined) {
            if (phone && !/^01\d{9}$/.test(phone)) {
                throw new BadRequestException('Phone number must be 11 digits starting with 01');
            }
            user.set('phone', phone);
        }
        if (profilePicture !== undefined) user.set('profilePicture', profilePicture);
        if (instapayNumber !== undefined) user.set('instapayNumber', instapayNumber);
        if (instapayQR !== undefined) {
            user.set('instapayQR', instapayQR);
            user.markModified('instapayQR');
        }

        return await user.save();
    }

    async updateLanguage(id: string, language: 'en' | 'ar'): Promise<UserDocument> {
        if (!['en', 'ar'].includes(language)) {
            throw new BadRequestException('Invalid language. Allowed values: en, ar');
        }
        const user = await this.userModel
            .findByIdAndUpdate(id, { language }, { new: true })
            .select('-password')
            .exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async createUserByAdmin(createDto: any): Promise<UserDocument> {
        const { email, password, name, role, phone, instapayNumber, instapayQR, username } = createDto;

        // Allow Admin, Organizer, or Scanner roles
        if (role !== UserRole.ADMIN && role !== UserRole.ORGANIZER && role !== UserRole.SCANNER) {
            throw new BadRequestException('Admin can only create Admin, Organizer, or Scanner accounts');
        }

        // Scanner uses username, others use email
        if (role === UserRole.SCANNER) {
            if (!username) {
                throw new BadRequestException('Scanner accounts require a username');
            }
            const existingScanner = await this.findOneByUsername(username);
            if (existingScanner) {
                throw new ConflictException('Scanner with this username already exists');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newScanner = new this.userModel({
                name,
                username,
                password: hashedPassword,
                role: UserRole.SCANNER,
                isVerified: true,
                requiresPasswordChange: false,
            });
            return newScanner.save();
        }

        // Regular admin/organizer creation (email-based)
        const existingUser = await this.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUserPayload: any = {
            name,
            email,
            password: hashedPassword,
            role: role,
            isVerified: false, // Requires OTP verification
            requiresPasswordChange: true, // Must set own password on first login
        };
        if (phone) {
            if (!/^01\d{9}$/.test(phone)) {
                throw new BadRequestException('Phone number must be 11 digits starting with 01');
            }
            newUserPayload.phone = phone;
        }
        if (instapayNumber) newUserPayload.instapayNumber = instapayNumber;
        if (instapayQR) newUserPayload.instapayQR = instapayQR;

        const newUser = new this.userModel(newUserPayload);

        return newUser.save();
    }

    async blockUser(id: string, isBlocked: boolean): Promise<UserDocument> {
        const user = await this.userModel
            .findByIdAndUpdate(id, { isBlocked }, { new: true })
            .select('-password')
            .exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }
}
