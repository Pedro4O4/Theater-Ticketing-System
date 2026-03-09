import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
    STANDARD = 'Standard User',
    ORGANIZER = 'Organizer',
    ADMIN = 'System Admin',
    SCANNER = 'Scanner',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, minlength: 3, maxlength: 30 })
    name: string;

    @Prop({ required: false, unique: true, sparse: true })
    email: string;

    @Prop({ required: false, unique: true, sparse: true })
    username: string;

    @Prop()
    phone: string;

    @Prop()
    instapayNumber: string;

    @Prop()
    instapayQR: string;

    @Prop({ required: false })
    profilePicture?: string;

    @Prop({ required: true })
    password: string;

    @Prop({
        required: true,
        enum: UserRole,
        default: UserRole.STANDARD,
    })
    role: string;

    @Prop()
    otp?: string;

    @Prop()
    otpExpires?: Date;

    @Prop({ default: false })
    isVerified: boolean;

    @Prop({ default: false })
    requiresPasswordChange: boolean;

    @Prop({ default: false })
    isBlocked: boolean;

    @Prop({ default: 'en', enum: ['en', 'ar'] })
    language: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

