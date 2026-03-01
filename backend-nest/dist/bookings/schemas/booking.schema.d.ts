import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Event } from '../../events/schemas/event.schema';
export type BookingDocument = Booking & Document;
declare class SelectedSeat {
    row: string;
    seatNumber: number;
    section: string;
    seatType: string;
    price: number;
    attendeeName: string;
    attendeePhone: string;
}
export declare class Booking {
    StandardId: User | MongooseSchema.Types.ObjectId;
    eventId: Event | MongooseSchema.Types.ObjectId;
    numberOfTickets: number;
    totalPrice: number;
    status: string;
    hasTheaterSeating: boolean;
    pendingExpiresAt: Date;
    selectedSeats: SelectedSeat[];
}
export declare const BookingSchema: MongooseSchema<Booking, import("mongoose").Model<Booking, any, any, any, Document<unknown, any, Booking, any, import("mongoose").DefaultSchemaOptions> & Booking & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, Booking>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Booking, Document<unknown, {}, Booking, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    StandardId?: import("mongoose").SchemaDefinitionProperty<User | MongooseSchema.Types.ObjectId, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    eventId?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId | Event, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    numberOfTickets?: import("mongoose").SchemaDefinitionProperty<number, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalPrice?: import("mongoose").SchemaDefinitionProperty<number, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    hasTheaterSeating?: import("mongoose").SchemaDefinitionProperty<boolean, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    pendingExpiresAt?: import("mongoose").SchemaDefinitionProperty<Date, Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    selectedSeats?: import("mongoose").SchemaDefinitionProperty<SelectedSeat[], Booking, Document<unknown, {}, Booking, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Booking & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Booking>;
export {};
