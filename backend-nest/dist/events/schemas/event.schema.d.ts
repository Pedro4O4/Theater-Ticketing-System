import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Theater } from '../../theaters/schemas/theater.schema';
export type EventDocument = Event & Document;
declare class SeatPricing {
    seatType: string;
    price: number;
}
declare class BookedSeat {
    row: string;
    seatNumber: number;
    section: string;
    bookingId: MongooseSchema.Types.ObjectId;
    holdId: MongooseSchema.Types.ObjectId;
}
declare class EventSeatConfig {
    row: string;
    seatNumber: number;
    seatType: string;
    section: string;
}
export declare class Event {
    organizerId: User | MongooseSchema.Types.ObjectId;
    title: string;
    description: string;
    date: Date;
    location: string;
    category: string;
    image: string;
    ticketPrice: number;
    totalTickets: number;
    remainingTickets: number;
    status: string;
    theater: Theater | MongooseSchema.Types.ObjectId;
    hasTheaterSeating: boolean;
    seatPricing: SeatPricing[];
    bookedSeats: BookedSeat[];
    seatConfig: EventSeatConfig[];
    otp: string;
    otpExpires: Date;
}
export declare const EventSchema: MongooseSchema<Event, import("mongoose").Model<Event, any, any, any, (Document<unknown, any, Event, any, import("mongoose").DefaultSchemaOptions> & Event & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Event, any, import("mongoose").DefaultSchemaOptions> & Event & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Event>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Event, Document<unknown, {}, Event, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    organizerId?: import("mongoose").SchemaDefinitionProperty<User | MongooseSchema.Types.ObjectId, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    date?: import("mongoose").SchemaDefinitionProperty<Date, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    location?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    category?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    image?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    ticketPrice?: import("mongoose").SchemaDefinitionProperty<number, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalTickets?: import("mongoose").SchemaDefinitionProperty<number, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    remainingTickets?: import("mongoose").SchemaDefinitionProperty<number, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    theater?: import("mongoose").SchemaDefinitionProperty<MongooseSchema.Types.ObjectId | Theater, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    hasTheaterSeating?: import("mongoose").SchemaDefinitionProperty<boolean, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    seatPricing?: import("mongoose").SchemaDefinitionProperty<SeatPricing[], Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    bookedSeats?: import("mongoose").SchemaDefinitionProperty<BookedSeat[], Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    seatConfig?: import("mongoose").SchemaDefinitionProperty<EventSeatConfig[], Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    otp?: import("mongoose").SchemaDefinitionProperty<string, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    otpExpires?: import("mongoose").SchemaDefinitionProperty<Date, Event, Document<unknown, {}, Event, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Event & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Event>;
export {};
