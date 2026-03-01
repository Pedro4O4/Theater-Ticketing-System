import { BookingsService } from './bookings.service';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
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
    remove(id: string): Promise<{
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
    getEventBookings(eventId: string): Promise<{
        success: boolean;
        count: number;
        data: import("./schemas/booking.schema").BookingDocument[];
    }>;
    updateBookingStatus(id: string, status: string): Promise<{
        success: boolean;
        data: import("./schemas/booking.schema").BookingDocument;
    }>;
}
