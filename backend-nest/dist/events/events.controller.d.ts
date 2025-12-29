import { EventsService } from './events.service';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    create(createDto: any, req: any): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument;
    }>;
    findAllApproved(): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument[];
    }>;
    findAll(req: any): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument[];
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument;
    }>;
    update(id: string, updateDto: any): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument;
    }>;
    requestDeletionOTP(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyDeletionOTP(eventId: string, otp: string): Promise<{
        success: boolean;
        message: string;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getMyEvents(req: any): Promise<{
        success: boolean;
        data: import("./schemas/event.schema").EventDocument[];
    }>;
    getOrganizerAnalytics(req: any): Promise<{
        success: boolean;
        data: any;
    }>;
}
