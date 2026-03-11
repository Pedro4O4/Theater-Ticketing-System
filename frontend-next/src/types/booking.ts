export interface SelectedSeat {
    section: string;
    row: string;
    seatNumber: number;
    seatLabel?: string;
}

export interface Seat extends SelectedSeat {
    _id: string;
    eventId: string;
    seatType: 'standard' | 'vip' | 'premium' | 'wheelchair';
    price: number;
    isBooked: boolean;
    isPending?: boolean;
    isActive: boolean;
    seatLabel?: string;
}

export interface SeatPricing {
    seatType: string;
    price: number;
}
