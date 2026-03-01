export interface SelectedSeat {
    section: string;
    row: string;
    seatNumber: number;
}

export interface Seat extends SelectedSeat {
    _id: string;
    eventId: string;
    seatType: 'standard' | 'vip' | 'premium' | 'wheelchair';
    price: number;
    isBooked: boolean;
    isPending?: boolean;
    isActive: boolean;
}

export interface SeatPricing {
    seatType: string;
    price: number;
}
