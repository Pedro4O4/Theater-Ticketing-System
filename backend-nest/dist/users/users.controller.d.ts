import { UsersService } from './users.service';
import { EventsService } from '../events/events.service';
import { BookingsService } from '../bookings/bookings.service';
export declare class UsersController {
    private readonly usersService;
    private readonly eventsService;
    private readonly bookingsService;
    constructor(usersService: UsersService, eventsService: EventsService, bookingsService: BookingsService);
    getProfile(req: any): Promise<{
        success: boolean;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    updateProfile(req: any, updateDto: any): Promise<{
        success: boolean;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    getMyEvents(req: any): Promise<{
        success: boolean;
        data: import("../events/schemas/event.schema").EventDocument[];
    }>;
    getMyEventsAnalytics(req: any): Promise<any>;
    updateLanguage(req: any, language: 'en' | 'ar'): Promise<{
        success: boolean;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    getMyBookings(req: any): Promise<{
        success: boolean;
        data: import("../bookings/schemas/booking.schema").BookingDocument[];
    }>;
    findAll(): Promise<{
        success: boolean;
        count: number;
        data: import("./schemas/user.schema").UserDocument[];
    }>;
    createUser(createUserDto: any): Promise<{
        success: boolean;
        message: string;
        data: {
            _id: import("mongoose").Types.ObjectId;
            name: string;
            email: string;
            role: string;
            isVerified: boolean;
        };
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    updateRole(id: string, role: string): Promise<{
        success: boolean;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    blockUser(id: string, isBlocked: boolean): Promise<{
        success: boolean;
        message: string;
        data: import("./schemas/user.schema").UserDocument;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
