import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { SeatHold, SeatHoldDocument } from './schemas/seat-hold.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Theater, TheaterDocument } from '../theaters/schemas/theater.schema';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class BookingsService implements OnModuleInit {
    private readonly logger = new Logger(BookingsService.name);

    constructor(
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
        @InjectModel(SeatHold.name) private seatHoldModel: Model<SeatHoldDocument>,
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
            // 1. Cleanup expired seat holds
            const expiredHolds = await this.seatHoldModel.find({
                expiresAt: { $lte: new Date() },
            }).exec();

            for (const hold of expiredHolds) {
                await this.eventModel.findByIdAndUpdate(hold.eventId, {
                    $pull: { bookedSeats: { holdId: hold._id } },
                    $inc: { remainingTickets: hold.seats.length },
                });
                await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
                this.logger.log(`Expired seat hold ${hold._id} cleaned up (${hold.seats.length} seats released)`);
            }

            // 2. Cleanup expired pending bookings
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
            this.logger.error('Error cleaning up expired bookings/holds', err);
        }
    }

    // ─── Seat Hold Methods ────────────────────────────────────────────

    /**
     * Hold seats temporarily (5 min) while user fills attendee info.
     * Uses atomic findOneAndUpdate to prevent race conditions.
     */
    async holdSeats(
        eventId: string,
        seats: { row: string; seatNumber: number; section: string }[],
        userId: string,
    ): Promise<{ holdId: string; expiresAt: Date; seats: any[] }> {
        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (!event.hasTheaterSeating) {
            throw new BadRequestException('This event does not have theater seating');
        }

        if (!seats || seats.length === 0) {
            throw new BadRequestException('No seats selected');
        }

        if (seats.length > 10) {
            throw new BadRequestException('Cannot hold more than 10 seats at once');
        }

        // Release any existing holds by this user for this event first
        await this.releaseUserHolds(eventId, userId);

        // Create the SeatHold document to get the holdId
        const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        const normalizedSeats = seats.map(s => ({
            row: String(s.row),
            seatNumber: Number(s.seatNumber),
            section: s.section || 'main',
        }));

        const seatHold = new this.seatHoldModel({
            userId,
            eventId,
            seats: normalizedSeats,
            expiresAt: holdExpiresAt,
        });
        const savedHold = await seatHold.save();

        // Atomic: push seats to event.bookedSeats ONLY if none of them exist yet
        const seatConditions = normalizedSeats.map(s => ({
            bookedSeats: {
                $elemMatch: {
                    row: s.row,
                    seatNumber: s.seatNumber,
                    section: s.section,
                },
            },
        }));

        const holdEntries = normalizedSeats.map(s => ({
            row: s.row,
            seatNumber: s.seatNumber,
            section: s.section,
            holdId: savedHold._id,
        }));

        const result = await this.eventModel.findOneAndUpdate(
            {
                _id: eventId,
                $nor: seatConditions,
            },
            {
                $push: { bookedSeats: { $each: holdEntries } },
                $inc: { remainingTickets: -normalizedSeats.length },
            },
            { new: true },
        );

        if (!result) {
            // Atomic check failed — some seats already taken
            await this.seatHoldModel.findByIdAndDelete(savedHold._id).exec();

            // Find which specific seats conflict
            const currentEvent = await this.eventModel.findById(eventId).exec();
            const bookedSet = new Set(
                (currentEvent?.bookedSeats || []).map(
                    (s: any) => `${s.section}-${s.row}-${s.seatNumber}`,
                ),
            );
            const conflicting = normalizedSeats
                .filter(s => bookedSet.has(`${s.section}-${s.row}-${s.seatNumber}`))
                .map(s => `${s.row}${s.seatNumber}`);

            throw new BadRequestException(
                `Seats no longer available: ${conflicting.join(', ')}`,
            );
        }

        return {
            holdId: savedHold._id.toString(),
            expiresAt: holdExpiresAt,
            seats: normalizedSeats,
        };
    }

    /**
     * Release a specific seat hold.
     */
    async releaseHold(holdId: string, userId: string): Promise<void> {
        const hold = await this.seatHoldModel.findById(holdId).exec();
        if (!hold) {
            return; // Already released or expired — no-op
        }

        if (hold.userId.toString() !== userId.toString()) {
            throw new ForbiddenException('You cannot release this hold');
        }

        await this.eventModel.findByIdAndUpdate(hold.eventId, {
            $pull: { bookedSeats: { holdId: hold._id } },
            $inc: { remainingTickets: hold.seats.length },
        });

        await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
    }

    /**
     * Release all holds by a user for a specific event.
     */
    private async releaseUserHolds(eventId: string, userId: string): Promise<void> {
        const existingHolds = await this.seatHoldModel.find({
            eventId,
            userId,
        } as any).exec();

        for (const hold of existingHolds) {
            await this.eventModel.findByIdAndUpdate(hold.eventId, {
                $pull: { bookedSeats: { holdId: hold._id } },
                $inc: { remainingTickets: hold.seats.length },
            });
            await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
        }
    }


    async create(createDto: any, userId: string): Promise<BookingDocument> {
        const { eventId, numberOfTickets, status, selectedSeats, holdId } = createDto;

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
            // ── Validate hold if provided ───────────────────────────────
            let hold: SeatHoldDocument | null = null;
            if (holdId) {
                hold = await this.seatHoldModel.findById(holdId).exec();
                if (!hold) {
                    throw new BadRequestException('Seat hold expired or not found. Please select seats again.');
                }
                if (hold.userId.toString() !== userId.toString()) {
                    throw new ForbiddenException('This hold does not belong to you');
                }
                if (hold.eventId.toString() !== eventId.toString()) {
                    throw new BadRequestException('Hold does not match this event');
                }
                if (new Date() > hold.expiresAt) {
                    // Hold expired — clean it up
                    await this.eventModel.findByIdAndUpdate(hold.eventId, {
                        $pull: { bookedSeats: { holdId: hold._id } },
                        $inc: { remainingTickets: hold.seats.length },
                    });
                    await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
                    throw new BadRequestException('Seat hold has expired. Please select seats again.');
                }

                // Verify all selected seats match the hold
                const holdSeatKeys = new Set(
                    hold.seats.map((s: any) => `${s.section || 'main'}-${s.row}-${s.seatNumber}`),
                );
                for (const seat of selectedSeats) {
                    const key = `${seat.section || 'main'}-${seat.row}-${seat.seatNumber}`;
                    if (!holdSeatKeys.has(key)) {
                        throw new BadRequestException(
                            `Seat ${seat.row}${seat.seatNumber} is not in your hold. Please select seats again.`,
                        );
                    }
                }
            } else {
                // No hold — use atomic check to prevent race conditions
                const seatConditions = selectedSeats.map((seat: any) => ({
                    bookedSeats: {
                        $elemMatch: {
                            row: String(seat.row),
                            seatNumber: Number(seat.seatNumber),
                            section: seat.section || 'main',
                        },
                    },
                }));

                // Dry-run: check if any seats are taken (for detailed error)
                const unavailableSeats = [];
                for (const seat of selectedSeats) {
                    const isBooked = event.bookedSeats.some(
                        (bs: any) =>
                            bs.row === String(seat.row) &&
                            bs.seatNumber === Number(seat.seatNumber) &&
                            (bs.section || 'main') === (seat.section || 'main'),
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

            if (hold) {
                // Convert hold entries → booking entries in bookedSeats
                // First pull the hold entries, then push booking entries
                await this.eventModel.findByIdAndUpdate(eventId, {
                    $pull: { bookedSeats: { holdId: hold._id } },
                });

                const seatUpdates = seatsWithPrices.map((seat: any) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    bookingId: savedBooking._id,
                }));

                await this.eventModel.findByIdAndUpdate(eventId, {
                    $push: { bookedSeats: { $each: seatUpdates } },
                });

                // Delete the hold
                await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
            } else {
                // No hold — atomic push with $nor guard
                const seatUpdates = seatsWithPrices.map((seat: any) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    bookingId: savedBooking._id,
                }));

                const atomicSeatConditions = seatsWithPrices.map((seat: any) => ({
                    bookedSeats: {
                        $elemMatch: {
                            row: seat.row,
                            seatNumber: seat.seatNumber,
                            section: seat.section,
                        },
                    },
                }));

                const atomicResult = await this.eventModel.findOneAndUpdate(
                    {
                        _id: eventId,
                        $nor: atomicSeatConditions,
                    },
                    {
                        $push: { bookedSeats: { $each: seatUpdates } },
                        $inc: { remainingTickets: -selectedSeats.length },
                    },
                    { new: true },
                );

                if (!atomicResult) {
                    // Race condition: seats were taken between check and update
                    await this.bookingModel.findByIdAndDelete(savedBooking._id).exec();
                    throw new BadRequestException(
                        'Some seats were just booked by another user. Please refresh and try again.',
                    );
                }
            }

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
                    select: 'name instapayNumber instapayQR instapayLink'
                }
            })
            .exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }
        return booking;
    }

    async findAllForUser(userId: string): Promise<BookingDocument[]> {
        const bookings = await this.bookingModel
            .find({ StandardId: userId } as any)
            .populate({
                path: 'eventId',
                populate: {
                    path: 'organizerId',
                    select: 'name instapayNumber instapayQR instapayLink'
                }
            })
            .sort({ createdAt: -1 })
            .exec();

        if (bookings[0]) {
            const org = (bookings[0].eventId as any)?.organizerId;
            try {
                console.log('DEBUG_BOOKINGS_LINK:', org?.instapayLink);
                console.log('DEBUG_BOOKINGS_ORG_KEYS:', org ? Object.keys(org.toObject ? org.toObject() : org) : 'NO_ORG');
            } catch (e) { }
        }
        return bookings;
    }

    async findAllForSpecificUser(targetUserId: string, requestingUser: any): Promise<BookingDocument[]> {
        // Enforce admin check
        if (requestingUser.role !== 'System Admin') {
            throw new ForbiddenException('Only admins can view other users bookings');
        }

        return this.bookingModel
            .find({ StandardId: targetUserId } as any)
            .populate({
                path: 'eventId',
                populate: {
                    path: 'organizerId',
                    select: 'name instapayNumber instapayQR instapayLink'
                }
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async delete(id: string, userId: string): Promise<void> {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Only the booking owner can cancel their own booking
        if (booking.StandardId.toString() !== userId.toString()) {
            throw new ForbiddenException('You are not authorised to cancel this booking');
        }

        // Cannot cancel a confirmed booking
        if (booking.status === 'confirmed') {
            throw new BadRequestException('Cannot cancel a confirmed booking');
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

    async updateBookingStatus(bookingId: string, status: string, user: any): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (!['confirmed', 'rejected'].includes(status)) {
            throw new BadRequestException('Status must be confirmed or rejected');
        }

        // Only the event organizer or an admin can update booking status
        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }
        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new ForbiddenException('Only the event organizer or an admin can update booking status');
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

        // Run pending bookings + active holds queries in parallel
        const [pendingBookings, activeHolds] = await Promise.all([
            this.bookingModel.find({
                eventId,
                status: 'pending',
            } as any).select('selectedSeats').lean().exec(),
            this.seatHoldModel.find({
                eventId,
                expiresAt: { $gt: new Date() },
            } as any).select('seats').lean().exec(),
        ]);

        const pendingSeatsSet = new Set<string>();
        for (const pb of pendingBookings) {
            if ((pb as any).selectedSeats) {
                for (const s of (pb as any).selectedSeats) {
                    pendingSeatsSet.add(`${s.section}-${s.row}-${s.seatNumber}`);
                }
            }
        }

        const heldSeatsSet = new Set<string>();
        for (const hold of activeHolds) {
            for (const s of (hold as any).seats) {
                heldSeatsSet.add(`${(s.section || 'main')}-${s.row}-${s.seatNumber}`);
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
                    isPending: pendingSeatsSet.has(seatKey) || heldSeatsSet.has(seatKey),
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
                        isPending: pendingSeatsSet.has(seatKey) || heldSeatsSet.has(seatKey),
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

    /**
     * Cancel selected seats from a pending booking.
     * If all seats are cancelled, the entire booking is deleted.
     */
    async cancelSelectedSeats(
        bookingId: string,
        userId: string,
        seatKeys: string[], // e.g. ['main-A-1', 'balcony-B-3']
        cancelAll: boolean,
    ): Promise<{ message: string; booking?: BookingDocument }> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.StandardId.toString() !== userId.toString()) {
            throw new ForbiddenException('You are not authorised to modify this booking');
        }

        if (booking.status !== 'pending') {
            throw new BadRequestException('Can only cancel seats from a pending booking');
        }

        if (!booking.hasTheaterSeating || !booking.selectedSeats?.length) {
            // Non-theater booking: just delete the whole booking
            await this.delete(bookingId, userId);
            return { message: 'Booking cancelled successfully' };
        }

        if (cancelAll || seatKeys.length >= booking.selectedSeats.length) {
            // Cancel entire booking
            await this.delete(bookingId, userId);
            return { message: 'All seats cancelled. Booking removed.' };
        }

        // Partial cancel: remove only selected seats
        const seatsToRemove = booking.selectedSeats.filter((s: any) =>
            seatKeys.includes(`${s.section}-${s.row}-${s.seatNumber}`),
        );

        if (seatsToRemove.length === 0) {
            throw new BadRequestException('No matching seats found to cancel');
        }

        const seatKeysToRemove = new Set(
            seatsToRemove.map((s: any) => `${s.section}-${s.row}-${s.seatNumber}`),
        );

        const remainingSeats = booking.selectedSeats.filter(
            (s: any) => !seatKeysToRemove.has(`${s.section}-${s.row}-${s.seatNumber}`),
        );

        const removedPrice = seatsToRemove.reduce((sum: number, s: any) => sum + (s.price || 0), 0);

        // Release the removed seats from the event
        for (const seat of seatsToRemove) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: {
                    bookedSeats: {
                        row: (seat as any).row,
                        seatNumber: (seat as any).seatNumber,
                        section: (seat as any).section,
                        bookingId: booking._id,
                    },
                },
                $inc: { remainingTickets: 1 },
            });
        }

        // Update booking
        booking.selectedSeats = remainingSeats as any;
        booking.numberOfTickets = remainingSeats.length;
        booking.totalPrice = booking.totalPrice - removedPrice;
        const savedBooking = await booking.save();

        return {
            message: `${seatsToRemove.length} seat(s) cancelled successfully`,
            booking: savedBooking,
        };
    }

    /**
     * Request cancellation for a confirmed booking (user side).
     */
    async requestCancellation(
        bookingId: string,
        userId: string,
        seatKeys: string[],
        cancelAll: boolean,
        reason: string,
    ): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.StandardId.toString() !== userId.toString()) {
            throw new ForbiddenException('You are not authorised to modify this booking');
        }

        const isConfirmed = booking.status === 'confirmed';
        const isPendingWithReceipt = booking.status === 'pending' && booking.isReceiptUploaded === true;
        if (!isConfirmed && !isPendingWithReceipt) {
            throw new BadRequestException('Can only request cancellation for confirmed bookings or pending bookings with receipt uploaded');
        }

        // Filter out already-scanned seats
        const scannedTickets = await this.ticketsService.getScannedSeatsForBooking(bookingId);
        const scannedKeys = new Set(
            scannedTickets.map((t: any) => `${t.section}-${t.seatRow}-${t.seatNumber}`),
        );

        const newSeatsToCancel = (cancelAll
            ? booking.selectedSeats.map((s: any) => ({
                row: s.row,
                seatNumber: s.seatNumber,
                section: s.section || 'main',
            }))
            : seatKeys.map((key) => {
                const [section, row, seatNum] = key.split('-');
                return { section, row, seatNumber: parseInt(seatNum, 10) };
            })
        ).filter((s: any) => !scannedKeys.has(`${s.section}-${s.row}-${s.seatNumber}`));

        if (newSeatsToCancel.length === 0) {
            throw new BadRequestException('All selected seats have already been scanned and cannot be cancelled');
        }

        // If a request is already pending, merge new seats into it
        if (booking.cancellationRequest?.status === 'pending') {
            const existingKeys = new Set(
                (booking.cancellationRequest.seatsToCancel || []).map(
                    (s: any) => `${s.section}-${s.row}-${s.seatNumber}`,
                ),
            );
            const merged = [...(booking.cancellationRequest.seatsToCancel || [])];
            for (const seat of newSeatsToCancel) {
                const key = `${seat.section}-${seat.row}-${seat.seatNumber}`;
                if (!existingKeys.has(key)) {
                    merged.push(seat);
                    existingKeys.add(key);
                }
            }
            const isCancelAll = cancelAll || merged.length >= booking.selectedSeats.length;
            booking.cancellationRequest = {
                status: 'pending',
                requestedAt: booking.cancellationRequest.requestedAt,
                reason: reason || booking.cancellationRequest.reason || '',
                seatsToCancel: merged as any,
                cancelAll: isCancelAll,
            } as any;
            return booking.save();
        }

        booking.cancellationRequest = {
            status: 'pending',
            requestedAt: new Date(),
            reason: reason || '',
            seatsToCancel: newSeatsToCancel as any,
            cancelAll,
        } as any;

        return booking.save();
    }

    /**
     * Get all cancellation requests for an event (organizer side).
     */
    async getCancellationRequests(eventId: string): Promise<BookingDocument[]> {
        return this.bookingModel
            .find({
                eventId,
                'cancellationRequest.status': 'pending',
            } as any)
            .populate('StandardId', 'name email phone')
            .sort({ 'cancellationRequest.requestedAt': -1 })
            .exec();
    }

    /**
     * Approve a cancellation request: free the chairs and update booking.
     */
    async approveCancellation(bookingId: string, user: any): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new ForbiddenException('Only the event organizer or an admin can approve cancellations');
        }

        if (booking.cancellationRequest?.status !== 'pending') {
            throw new BadRequestException('No pending cancellation request found');
        }

        const cancelAll = booking.cancellationRequest.cancelAll;
        const seatsToCancel = booking.cancellationRequest.seatsToCancel || [];

        if (cancelAll || seatsToCancel.length >= booking.selectedSeats.length) {
            // Cancel entire booking: free all seats
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

            // Delete tickets for this booking
            try {
                await this.ticketsService.deleteTicketsForBooking(bookingId);
            } catch (err) {
                this.logger.error(`Error deleting tickets for booking ${bookingId}:`, err);
            }

            booking.status = 'canceled';
            booking.cancellationRequest = {
                status: 'approved',
                requestedAt: booking.cancellationRequest.requestedAt,
                reason: booking.cancellationRequest.reason,
                seatsToCancel: seatsToCancel as any,
                cancelAll: true,
            } as any;

            return booking.save();
        }

        // Partial cancellation: free only selected seats
        const seatKeysToCancel = new Set(
            seatsToCancel.map((s: any) => `${s.section}-${s.row}-${s.seatNumber}`),
        );

        for (const seat of seatsToCancel) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: {
                    bookedSeats: {
                        row: (seat as any).row,
                        seatNumber: (seat as any).seatNumber,
                        section: (seat as any).section,
                        bookingId: booking._id,
                    },
                },
                $inc: { remainingTickets: 1 },
            });
        }

        // Delete tickets for the cancelled seats
        try {
            await this.ticketsService.deleteTicketsForSeats(
                bookingId,
                seatsToCancel.map((s: any) => ({
                    row: s.row,
                    seatNumber: s.seatNumber,
                    section: s.section,
                })),
            );
        } catch (err) {
            this.logger.error(`Error deleting tickets for partial cancellation of booking ${bookingId}:`, err);
        }

        const removedPrice = booking.selectedSeats
            .filter((s: any) => seatKeysToCancel.has(`${s.section}-${s.row}-${s.seatNumber}`))
            .reduce((sum: number, s: any) => sum + (s.price || 0), 0);

        const remainingSeats = booking.selectedSeats.filter(
            (s: any) => !seatKeysToCancel.has(`${s.section}-${s.row}-${s.seatNumber}`),
        );

        booking.selectedSeats = remainingSeats as any;
        booking.numberOfTickets = remainingSeats.length;
        booking.totalPrice = booking.totalPrice - removedPrice;

        // Reset to 'none' so the user can request cancellation for remaining seats
        booking.cancellationRequest = {
            status: 'none',
            requestedAt: null,
            reason: '',
            seatsToCancel: [],
            cancelAll: false,
        } as any;

        return booking.save();
    }

    /**
     * Reject a cancellation request.
     */
    async rejectCancellation(bookingId: string, user: any): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new ForbiddenException('Only the event organizer or an admin can reject cancellations');
        }

        if (booking.cancellationRequest?.status !== 'pending') {
            throw new BadRequestException('No pending cancellation request found');
        }

        booking.cancellationRequest = {
            status: 'rejected',
            requestedAt: booking.cancellationRequest.requestedAt,
            reason: booking.cancellationRequest.reason,
            seatsToCancel: booking.cancellationRequest.seatsToCancel as any,
            cancelAll: booking.cancellationRequest.cancelAll,
        } as any;

        return booking.save();
    }
}
