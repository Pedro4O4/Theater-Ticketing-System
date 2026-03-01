import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PendingRegistrationDocument = PendingRegistration & Document;

@Schema({ timestamps: true })
export class PendingRegistration {
    @Prop({ required: true, minlength: 3, maxlength: 30 })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop()
    phone: string;

    @Prop({ required: true })
    password: string; // already hashed

    @Prop({ required: true })
    otp: string;

    @Prop({ required: true })
    otpExpires: Date;

    @Prop({ default: Date.now, expires: 600 }) // TTL: auto-delete after 10 minutes
    createdAt: Date;
}

export const PendingRegistrationSchema = SchemaFactory.createForClass(PendingRegistration);
