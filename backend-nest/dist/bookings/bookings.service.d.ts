import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { BookingDocument } from './schemas/booking.schema';
import { EventDocument } from '../events/schemas/event.schema';
import { TheaterDocument } from '../theaters/schemas/theater.schema';
export declare class BookingsService implements OnModuleInit {
    private bookingModel;
    private eventModel;
    private theaterModel;
    private readonly logger;
    constructor(bookingModel: Model<BookingDocument>, eventModel: Model<EventDocument>, theaterModel: Model<TheaterDocument>);
    onModuleInit(): void;
    private cleanupExpiredBookings;
    create(createDto: any, userId: string): Promise<BookingDocument>;
    findOne(id: string): Promise<BookingDocument>;
    findAllForUser(userId: string): Promise<BookingDocument[]>;
    delete(id: string): Promise<void>;
    findAllForEvent(eventId: string): Promise<BookingDocument[]>;
    updateBookingStatus(bookingId: string, status: string): Promise<BookingDocument>;
    getAvailableSeats(eventId: string): Promise<any>;
}
