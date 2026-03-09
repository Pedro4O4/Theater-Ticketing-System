import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { BookingDocument } from './schemas/booking.schema';
import { SeatHoldDocument } from './schemas/seat-hold.schema';
import { EventDocument } from '../events/schemas/event.schema';
import { TheaterDocument } from '../theaters/schemas/theater.schema';
import { TicketsService } from '../tickets/tickets.service';
export declare class BookingsService implements OnModuleInit {
    private bookingModel;
    private seatHoldModel;
    private eventModel;
    private theaterModel;
    private readonly ticketsService;
    private readonly logger;
    constructor(bookingModel: Model<BookingDocument>, seatHoldModel: Model<SeatHoldDocument>, eventModel: Model<EventDocument>, theaterModel: Model<TheaterDocument>, ticketsService: TicketsService);
    onModuleInit(): void;
    private cleanupExpiredBookings;
    holdSeats(eventId: string, seats: {
        row: string;
        seatNumber: number;
        section: string;
    }[], userId: string): Promise<{
        holdId: string;
        expiresAt: Date;
        seats: any[];
    }>;
    releaseHold(holdId: string, userId: string): Promise<void>;
    private releaseUserHolds;
    create(createDto: any, userId: string): Promise<BookingDocument>;
    findOne(id: string): Promise<BookingDocument>;
    findAllForUser(userId: string): Promise<BookingDocument[]>;
    delete(id: string, userId: string): Promise<void>;
    findAllForEvent(eventId: string): Promise<BookingDocument[]>;
    updateBookingStatus(bookingId: string, status: string, user: any): Promise<BookingDocument>;
    uploadReceipt(bookingId: string, userId: string, receiptBase64: string): Promise<BookingDocument>;
    getAvailableSeats(eventId: string): Promise<any>;
    cancelSelectedSeats(bookingId: string, userId: string, seatKeys: string[], cancelAll: boolean): Promise<{
        message: string;
        booking?: BookingDocument;
    }>;
    requestCancellation(bookingId: string, userId: string, seatKeys: string[], cancelAll: boolean, reason: string): Promise<BookingDocument>;
    getCancellationRequests(eventId: string): Promise<BookingDocument[]>;
    approveCancellation(bookingId: string, user: any): Promise<BookingDocument>;
    rejectCancellation(bookingId: string, user: any): Promise<BookingDocument>;
}
