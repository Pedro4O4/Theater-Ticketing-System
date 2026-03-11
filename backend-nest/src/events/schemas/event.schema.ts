import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Theater } from '../../theaters/schemas/theater.schema';

export type EventDocument = Event & Document;

@Schema()
class SeatPricing {
    @Prop({
        enum: ['standard', 'vip', 'premium', 'wheelchair'],
        required: true,
    })
    seatType: string;

    @Prop({ min: 0, default: 0 })
    price: number;
}

@Schema()
class BookedSeat {
    @Prop({ required: true })
    row: string;

    @Prop({ required: true })
    seatNumber: number;

    @Prop({ enum: ['main', 'balcony'], default: 'main' })
    section: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking' })
    bookingId: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SeatHold' })
    holdId: MongooseSchema.Types.ObjectId;

    @Prop({ default: '' })
    seatLabel: string;
}

@Schema()
class EventSeatConfig {
    @Prop()
    row: string;

    @Prop()
    seatNumber: number;

    @Prop({
        enum: ['standard', 'vip', 'premium', 'wheelchair', 'disabled'],
        default: 'standard',
    })
    seatType: string;

    @Prop({ default: 'main' })
    section: string;

    @Prop({ default: '' })
    seatLabel: string;
}

@Schema({ timestamps: true })
export class Event {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    organizerId: User | MongooseSchema.Types.ObjectId;

    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ required: true, trim: true })
    description: string;

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true, trim: true })
    location: string;

    @Prop({ default: 'theater' })
    category: string;

    @Prop()
    startTime: string;

    @Prop()
    endTime: string;

    @Prop({ type: Date })
    cancellationDeadline: Date;

    @Prop({ default: 'default-image.jpg' })
    image: string;

    @Prop({ default: 0, min: 0 })
    ticketPrice: number;

    @Prop({ default: 0, min: 0 })
    totalTickets: number;

    @Prop({ default: 0, min: 0 })
    remainingTickets: number;

    @Prop({
        required: true,
        enum: ['approved', 'pending', 'declined'],
        default: 'pending',
    })
    status: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Theater', default: null })
    theater: Theater | MongooseSchema.Types.ObjectId;

    @Prop({ default: false })
    hasTheaterSeating: boolean;

    @Prop({ type: [SeatPricing] })
    seatPricing: SeatPricing[];

    @Prop({ type: [BookedSeat] })
    bookedSeats: BookedSeat[];

    @Prop({ type: [EventSeatConfig] })
    seatConfig: EventSeatConfig[];

    @Prop({ default: null })
    otp: string;

    @Prop({ default: null })
    otpExpires: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
