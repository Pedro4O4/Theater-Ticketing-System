import { BookingsService } from './bookings.service';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    holdSeats(body: {
        eventId: string;
        seats: {
            row: string;
            seatNumber: number;
            section: string;
        }[];
    }, req: any): Promise<{
        success: boolean;
        data: {
            holdId: string;
            expiresAt: Date;
            seats: any[];
        };
    }>;
    releaseHold(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    create(createDto: any, req: any): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
    findAllForUser(req: any): Promise<{
        success: boolean;
        count: number;
        data: import("./schemas/booking.schema").BookingDocument[];
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
    remove(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getAvailableSeats(eventId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    getEventSeats(eventId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    uploadReceipt(id: string, receiptBase64: string, req: any): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
        message?: undefined;
    }>;
    getEventBookings(eventId: string): Promise<{
        success: boolean;
        count: number;
        data: import("./schemas/booking.schema").BookingDocument[];
    }>;
    updateBookingStatus(id: string, status: string, req: any): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
    cancelSelectedSeats(id: string, body: {
        seatKeys: string[];
        cancelAll: boolean;
    }, req: any): Promise<{
        message: string;
        booking?: import("./schemas/booking.schema").BookingDocument;
        success: boolean;
    }>;
    requestCancellation(id: string, body: {
        seatKeys: string[];
        cancelAll: boolean;
        reason: string;
    }, req: any): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
    getCancellationRequests(eventId: string): Promise<{
        success: boolean;
        count: number;
        data: import("./schemas/booking.schema").BookingDocument[];
    }>;
    approveCancellation(id: string, req: any): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
    rejectCancellation(id: string, req: any): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
}
