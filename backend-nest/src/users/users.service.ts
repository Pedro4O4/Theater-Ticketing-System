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
        const { name, email, phone, profilePicture, instapayNumber } = updateDto;

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
        if (phone !== undefined) (user as any).phone = phone;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (instapayNumber !== undefined) (user as any).instapayNumber = instapayNumber;

        return await user.save();
    }

    // Admin-only: Create user with Admin or Organizer role (requires password change on first login)
    async createUserByAdmin(createDto: any): Promise<UserDocument> {
        const { email, password, name, role } = createDto;

        // Only allow Admin or Organizer roles
        if (role !== UserRole.ADMIN && role !== UserRole.ORGANIZER) {
            throw new BadRequestException('Admin can only create Admin or Organizer accounts');
        }

        const existingUser = await this.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new this.userModel({
            name,
            email,
            password: hashedPassword,
            role: role,
            isVerified: false, // Requires OTP verification
            requiresPasswordChange: true, // Must set own password on first login
        });

        return newUser.save();
    }
}
