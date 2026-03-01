import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
    STANDARD = 'Standard User',
    ORGANIZER = 'Organizer',
    ADMIN = 'System Admin',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, minlength: 3, maxlength: 30 })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop()
    phone: string;

    @Prop()
    instapayNumber: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
