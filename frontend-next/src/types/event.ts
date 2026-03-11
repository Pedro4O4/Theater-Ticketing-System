export interface SeatPricing {
    seatType: string;
    price: number;
}

export interface Organizer {
    _id?: string;
    name?: string;
    email?: string;
    instapayNumber?: string;
    instapayQR?: string;
    instapayLink?: string;
}

export interface Event {
    _id: string;
    id?: string; // Some API responses use id instead of _id
    title: string;
    name?: string; // Backward compatibility
    description: string;
    date: string;
    location: string;
    category: string;
    startTime?: string;
    endTime?: string;
    cancellationDeadline?: string;
    image?: string;
    ticketPrice: number;
    remainingTickets: number;
    totalTickets: number;
    status: 'pending' | 'approved' | 'declined' | 'Pending' | 'Approved' | 'Rejected' | string;
    organizer: string | Organizer;
    organizerId?: string | Organizer;
    theaterId?: string;
    hasTheaterSeating: boolean;
    seatPricing?: SeatPricing[];
    seatConfig?: any[];
}

export interface Booking {
    _id: string;
    event: string | Event;
    eventId?: string; // Alternative property name
    user: string;
    numberOfTickets: number;
    quantity?: number; // Alternative property name
    totalPrice: number;
    bookingDate: string;
    createdAt?: string;
    status: 'Confirmed' | 'Cancelled' | 'pending' | 'canceled' | string;
    pendingExpiresAt?: string;
    hasTheaterSeating?: boolean;
    seats?: Array<{
        section: string;
        row: string;
        seatNumber: number;
        seatType?: string;
        price?: number;
        seatLabel?: string;
    }>;
    selectedSeats?: Array<{
        section: string;
        row: string;
        seatNumber: number;
        seatType?: string;
        price?: number;
        seatLabel?: string;
    }>;
}

export interface Analytics {
    totalRevenue: number;
    ticketsSold: number;
    totalEvents: number;
    percentageSold: number;
    averageSoldPercentage: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
