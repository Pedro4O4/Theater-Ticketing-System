import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Event } from '../../events/schemas/event.schema';

export type BookingDocument = Booking & Document;

@Schema()
class SelectedSeat {
    @Prop({ required: true })
    row: string;

    @Prop({ required: true })
    seatNumber: number;

    @Prop({ enum: ['main', 'balcony'], default: 'main' })
    section: string;

    @Prop({
        enum: ['standard', 'vip', 'premium', 'wheelchair'],
        default: 'standard',
    })
    seatType: string;

    @Prop({ min: 0, required: true })
    price: number;

    @Prop()
    attendeeName: string;

    @Prop()
    attendeePhone: string;

    @Prop({ default: '' })
    seatLabel: string;
}

@Schema()
class CancellationSeat {
    @Prop({ required: true })
    row: string;

    @Prop({ required: true })
    seatNumber: number;

    @Prop({ enum: ['main', 'balcony'], default: 'main' })
    section: string;

    @Prop({ default: '' })
    seatLabel?: string;
}

@Schema()
class CancellationRequest {
    @Prop({
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
    })
    status: string;

    @Prop({ type: Date, default: null })
    requestedAt: Date;

    @Prop({ default: '' })
    reason: string;

    @Prop({ type: [CancellationSeat], default: [] })
    seatsToCancel: CancellationSeat[];

    @Prop({ default: false })
    cancelAll: boolean;
}

@Schema({ timestamps: true })
export class Booking {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    StandardId: User | MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true })
    eventId: Event | MongooseSchema.Types.ObjectId;

    @Prop({ required: true, min: 1 })
    numberOfTickets: number;

    @Prop({ required: true, min: 0 })
    totalPrice: number;

    @Prop({
        enum: ['pending', 'confirmed', 'canceled', 'rejected'],
        default: 'pending',
    })
    status: string;

    @Prop({ default: false })
    hasTheaterSeating: boolean;

    @Prop({ type: Date, default: null })
    pendingExpiresAt: Date;

    @Prop({ type: [SelectedSeat] })
    selectedSeats: SelectedSeat[];

    @Prop()
    instapayReceipt: string;

    @Prop({ default: false })
    isReceiptUploaded: boolean;

    @Prop({ type: CancellationRequest, default: () => ({ status: 'none' }) })
    cancellationRequest: CancellationRequest;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// NOTE: We intentionally do NOT use a MongoDB TTL index on pendingExpiresAt.
// A TTL index would delete pending booking documents without releasing the
// reserved seats back to the event's remainingTickets counter.  Seat release
// is handled by the setInterval cleanup in BookingsService.onModuleInit().
// If you previously had a TTL index in MongoDB, drop it manually:
//   db.bookings.dropIndex("pendingExpiresAt_1")
