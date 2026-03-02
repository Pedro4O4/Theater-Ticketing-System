import {
    Injectable,
    NotFoundException,
    BadRequestException,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Theater, TheaterDocument } from '../theaters/schemas/theater.schema';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class BookingsService implements OnModuleInit {
    private readonly logger = new Logger(BookingsService.name);

    constructor(
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
        @InjectModel(Event.name) private eventModel: Model<EventDocument>,
        @InjectModel(Theater.name) private theaterModel: Model<TheaterDocument>,
        private readonly ticketsService: TicketsService,
    ) { }

    onModuleInit() {
        // Check for expired pending bookings every 60 seconds
        setInterval(() => this.cleanupExpiredBookings(), 60 * 1000);
        // Also run immediately on startup
        this.cleanupExpiredBookings();
    }

    private async cleanupExpiredBookings() {
        try {
            const expiredBookings = await this.bookingModel.find({
                status: 'pending',
                pendingExpiresAt: { $lte: new Date() },
                isReceiptUploaded: { $ne: true }, // Don't delete if receipt is uploaded
            } as any).exec();

            for (const booking of expiredBookings) {
                // Release seats from the event
                if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
                    await this.eventModel.findByIdAndUpdate(booking.eventId, {
                        $pull: { bookedSeats: { bookingId: booking._id } },
                        $inc: { remainingTickets: booking.numberOfTickets },
                    });
                } else {
                    await this.eventModel.findByIdAndUpdate(booking.eventId, {
                        $inc: { remainingTickets: booking.numberOfTickets },
                    });
                }
                await this.bookingModel.findByIdAndDelete(booking._id).exec();
                this.logger.log(`Expired pending booking ${booking._id} cleaned up`);
            }
        } catch (err) {
            this.logger.error('Error cleaning up expired bookings', err);
        }
    }


    async create(createDto: any, userId: string): Promise<BookingDocument> {
        const { eventId, numberOfTickets, status, selectedSeats } = createDto;

        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        let totalPrice = 0;
        const bookingData: any = {
            StandardId: userId,
            eventId,
            status: 'pending',
            pendingExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };

        if (event.hasTheaterSeating && selectedSeats && selectedSeats.length > 0) {
            const unavailableSeats = [];
            for (const seat of selectedSeats) {
                const isBooked = event.bookedSeats.some(
                    (bs: any) =>
                        bs.row === seat.row &&
                        bs.seatNumber === seat.seatNumber &&
                        bs.section === seat.section,
                );
                if (isBooked) {
                    unavailableSeats.push(`${seat.row}${seat.seatNumber}`);
                }
            }

            if (unavailableSeats.length > 0) {
                throw new BadRequestException(
                    `Seats already booked: ${unavailableSeats.join(', ')}`,
                );
            }

            const theater = await this.theaterModel.findById(event.theater).exec();
            if (!theater) {
                throw new NotFoundException('Theater not found for this event');
            }

            const mergedSeatConfig = [...(theater.seatConfig || [])];
            if (event.seatConfig && event.seatConfig.length > 0) {
                event.seatConfig.forEach((eventSeat: any) => {
                    const existingIdx = mergedSeatConfig.findIndex(
                        (ts: any) =>
                            String(ts.row).trim().toLowerCase() === String(eventSeat.row).trim().toLowerCase() &&
                            Number(ts.seatNumber) === Number(eventSeat.seatNumber) &&
                            (String(ts.section || 'main').toLowerCase()) === (String(eventSeat.section || 'main').toLowerCase()),
                    );
                    if (existingIdx >= 0) {
                        mergedSeatConfig[existingIdx] = eventSeat;
                    } else {
                        mergedSeatConfig.push(eventSeat);
                    }
                });
            }

            const seatsWithPrices = selectedSeats.map((seat: any) => {
                const seatConfig = mergedSeatConfig.find(
                    (s: any) =>
                        String(s.row).trim().toLowerCase() === String(seat.row).trim().toLowerCase() &&
                        Number(s.seatNumber) === Number(seat.seatNumber) &&
                        (String(s.section || 'main').toLowerCase()) === (String(seat.section || 'main').toLowerCase()),
                );

                const seatType = (seatConfig?.seatType || 'standard').toLowerCase();

                // Case-insensitive pricing lookup
                const pricing = event.seatPricing.find(
                    (p: any) => String(p.seatType).toLowerCase() === seatType
                );

                const price = pricing ? pricing.price : (event.ticketPrice || 0);

                return {
                    row: String(seat.row),
                    seatNumber: Number(seat.seatNumber),
                    section: seat.section || 'main',
                    seatType,
                    price,
                    attendeeName: seat.attendeeName || '',
                    attendeePhone: seat.attendeePhone || '',
                };
            });

            totalPrice = seatsWithPrices.reduce(
                (sum: number, seat: any) => sum + seat.price,
                0,
            );

            bookingData.hasTheaterSeating = true;
            bookingData.selectedSeats = seatsWithPrices;
            bookingData.numberOfTickets = selectedSeats.length;
            bookingData.totalPrice = totalPrice;

            const booking = new this.bookingModel(bookingData);
            const savedBooking = await booking.save();

            const seatUpdates = seatsWithPrices.map((seat: any) => ({
                row: seat.row,
                seatNumber: seat.seatNumber,
                section: seat.section,
                bookingId: savedBooking._id,
            }));

            await this.eventModel.findByIdAndUpdate(eventId, {
                $push: { bookedSeats: { $each: seatUpdates } },
                $inc: { remainingTickets: -selectedSeats.length },
            });

            return savedBooking;
        } else {
            if (!numberOfTickets || numberOfTickets < 1) {
                throw new BadRequestException('Number of tickets is required');
            }

            if (event.remainingTickets < numberOfTickets) {
                throw new BadRequestException('Not enough tickets available');
            }

            totalPrice = numberOfTickets * event.ticketPrice;

            await this.eventModel.findByIdAndUpdate(eventId, {
                $inc: { remainingTickets: -numberOfTickets },
            });

            bookingData.numberOfTickets = numberOfTickets;
            bookingData.totalPrice = totalPrice;
            bookingData.hasTheaterSeating = false;

            const booking = new this.bookingModel(bookingData);
            return booking.save();
        }
    }

    async findOne(id: string): Promise<BookingDocument> {
        const booking = await this.bookingModel
            .findById(id)
            .populate({
                path: 'eventId',
                populate: {
                    path: 'organizerId',
                    select: 'name instapayNumber'
                }
            })
            .exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }
        return booking;
    }

    async findAllForUser(userId: string): Promise<BookingDocument[]> {
        return this.bookingModel
            .find({ StandardId: userId } as any)
            .populate('eventId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async delete(id: string): Promise<void> {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: { bookedSeats: { bookingId: booking._id } },
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        } else {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        }

        await this.bookingModel.findByIdAndDelete(id).exec();
    }

    async findAllForEvent(eventId: string): Promise<BookingDocument[]> {
        return this.bookingModel
            .find({ eventId } as any)
            .populate('StandardId', 'name email phone')
            .sort({ createdAt: -1 })
            .exec();
    }

    async updateBookingStatus(bookingId: string, status: string): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (!['confirmed', 'rejected'].includes(status)) {
            throw new BadRequestException('Status must be confirmed or rejected');
        }

        // If rejecting a previously pending booking that had seats, release the seats
        if (status === 'rejected' && booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: { bookedSeats: { bookingId: booking._id } },
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        }

        // If confirming, clear the TTL so it doesn't auto-delete
        if (status === 'confirmed') {
            booking.pendingExpiresAt = null as any;
        }

        booking.status = status;
        const savedBooking = await booking.save();

        // Generate QR code tickets when booking is confirmed
        if (status === 'confirmed' && booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            try {
                await this.ticketsService.generateTicketsForBooking(
                    bookingId,
                    booking.eventId.toString(),
                    booking.StandardId.toString(),
                    booking.selectedSeats.map((s: any) => ({
                        row: s.row,
                        seatNumber: s.seatNumber,
                        section: s.section || 'main',
                        seatType: s.seatType || 'standard',
                        price: s.price || 0,
                        attendeeName: s.attendeeName || '',
                        attendeePhone: s.attendeePhone || '',
                    })),
                );
                this.logger.log(`Generated ${booking.selectedSeats.length} QR tickets for booking ${bookingId}`);
            } catch (error) {
                this.logger.error(`Failed to generate QR tickets for booking ${bookingId}:`, error);
            }
        }

        return savedBooking;
    }

    async uploadReceipt(bookingId: string, userId: string, receiptBase64: string): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.StandardId.toString() !== userId.toString()) {
            throw new BadRequestException('You do not have permission to modify this booking');
        }

        if (booking.status !== 'pending') {
            throw new BadRequestException('Receipts can only be uploaded for pending bookings');
        }

        booking.instapayReceipt = receiptBase64;
        booking.isReceiptUploaded = true;
        // Remove expiration time so it won't auto-delete
        booking.pendingExpiresAt = null as any;

        return booking.save();
    }

    async getAvailableSeats(eventId: string): Promise<any> {
        const event = await this.eventModel
            .findById(eventId)
            .populate('theater')
            .exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (!event.hasTheaterSeating || !event.theater) {
            throw new BadRequestException('This event does not have theater seating');
        }

        const theater = event.theater as any;
        const bookedSeatsSet = new Set(
            event.bookedSeats.map((s: any) => `${s.section}-${s.row}-${s.seatNumber}`),
        );

        // Find pending bookings to mark seats as pending (yellow)
        const pendingBookings = await this.bookingModel.find({
            eventId,
            status: 'pending',
        } as any).exec();
        const pendingSeatsSet = new Set<string>();
        for (const pb of pendingBookings) {
            if (pb.selectedSeats) {
                for (const s of pb.selectedSeats as any[]) {
                    pendingSeatsSet.add(`${s.section}-${s.row}-${s.seatNumber}`);
                }
            }
        }

        const mergedSeatConfig = [...(theater.seatConfig || [])];
        if (event.seatConfig && event.seatConfig.length > 0) {
            event.seatConfig.forEach((eventSeat: any) => {
                const existingIdx = mergedSeatConfig.findIndex(
                    (ts: any) =>
                        String(ts.row).trim().toLowerCase() === String(eventSeat.row).trim().toLowerCase() &&
                        Number(ts.seatNumber) === Number(eventSeat.seatNumber) &&
                        (String(ts.section || 'main').toLowerCase()) === (String(eventSeat.section || 'main').toLowerCase()),
                );
                if (existingIdx >= 0) {
                    mergedSeatConfig[existingIdx] = eventSeat;
                } else {
                    mergedSeatConfig.push(eventSeat);
                }
            });
        }

        const allSeats = [];
        const removedSeatsSet = new Set(theater.layout.removedSeats || []);
        const disabledSeatsSet = new Set(theater.layout.disabledSeats || []);

        // Main floor
        const mainRows = theater.layout.mainFloor.rows;
        const mainRowLabels = theater.layout.mainFloor.rowLabels || [];
        for (let r = 0; r < mainRows; r++) {
            const rowLabel = mainRowLabels[r] || String.fromCharCode(65 + r);
            for (let s = 1; s <= theater.layout.mainFloor.seatsPerRow; s++) {
                const seatKey = `main-${rowLabel}-${s}`;
                if (removedSeatsSet.has(seatKey)) continue;

                const seatConfig = mergedSeatConfig.find(
                    (sc: any) =>
                        String(sc.row).trim().toLowerCase() === String(rowLabel).trim().toLowerCase() &&
                        Number(sc.seatNumber) === Number(s) &&
                        (String(sc.section || 'main').toLowerCase()) === 'main',
                );
                const isDisabled = disabledSeatsSet.has(seatKey);
                const isActive = !isDisabled && seatConfig?.isActive !== false;
                const seatType = (seatConfig?.seatType || 'standard').toLowerCase();

                const pricingRecord = event.seatPricing.find(
                    (p: any) => String(p.seatType).toLowerCase() === seatType
                );

                allSeats.push({
                    row: rowLabel,
                    seatNumber: s,
                    section: 'main',
                    seatType,
                    isActive,
                    isBooked: bookedSeatsSet.has(seatKey),
                    isPending: pendingSeatsSet.has(seatKey),
                    price: pricingRecord ? pricingRecord.price : (event.ticketPrice || 0),
                });
            }
        }

        // Balcony
        if (theater.layout.hasBalcony && theater.layout.balcony.rows > 0) {
            const balcRows = theater.layout.balcony.rows;
            const balcRowLabels = theater.layout.balcony.rowLabels || [];
            for (let r = 0; r < balcRows; r++) {
                const rowLabel = balcRowLabels[r] || `BALC-${String.fromCharCode(65 + r)}`;
                for (let s = 1; s <= theater.layout.balcony.seatsPerRow; s++) {
                    const seatKey = `balcony-${rowLabel}-${s}`;
                    if (removedSeatsSet.has(seatKey)) continue;

                    const seatConfig = mergedSeatConfig.find(
                        (sc: any) =>
                            String(sc.row).trim().toLowerCase() === String(rowLabel).trim().toLowerCase() &&
                            Number(sc.seatNumber) === Number(s) &&
                            (String(sc.section || 'main').toLowerCase()) === 'balcony',
                    );
                    const isDisabled = disabledSeatsSet.has(seatKey);
                    const isActive = !isDisabled && seatConfig?.isActive !== false;
                    const seatType = (seatConfig?.seatType || 'standard').toLowerCase();

                    const pricingRecord = event.seatPricing.find(
                        (p: any) => String(p.seatType).toLowerCase() === seatType
                    );

                    allSeats.push({
                        row: rowLabel,
                        seatNumber: s,
                        section: 'balcony',
                        seatType,
                        isActive,
                        isBooked: bookedSeatsSet.has(seatKey),
                        isPending: pendingSeatsSet.has(seatKey),
                        price: pricingRecord ? pricingRecord.price : (event.ticketPrice || 0),
                    });
                }
            }
        }

        return {
            theater: {
                _id: theater._id,
                name: theater.name,
                layout: theater.layout,
                seatConfig: theater.seatConfig,
                totalSeats: theater.totalSeats,
            },
            seatPricing: event.seatPricing,
            seats: allSeats,
            bookedCount: event.bookedSeats.length,
            availableCount: allSeats.filter((s) => !s.isBooked && s.isActive).length,
        };
    }
}
