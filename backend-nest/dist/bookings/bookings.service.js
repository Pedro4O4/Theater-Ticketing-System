"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const booking_schema_1 = require("./schemas/booking.schema");
const seat_hold_schema_1 = require("./schemas/seat-hold.schema");
const event_schema_1 = require("../events/schemas/event.schema");
const theater_schema_1 = require("../theaters/schemas/theater.schema");
const tickets_service_1 = require("../tickets/tickets.service");
let BookingsService = BookingsService_1 = class BookingsService {
    bookingModel;
    seatHoldModel;
    eventModel;
    theaterModel;
    ticketsService;
    logger = new common_1.Logger(BookingsService_1.name);
    constructor(bookingModel, seatHoldModel, eventModel, theaterModel, ticketsService) {
        this.bookingModel = bookingModel;
        this.seatHoldModel = seatHoldModel;
        this.eventModel = eventModel;
        this.theaterModel = theaterModel;
        this.ticketsService = ticketsService;
    }
    onModuleInit() {
        setInterval(() => this.cleanupExpiredBookings(), 60 * 1000);
        this.cleanupExpiredBookings();
    }
    async cleanupExpiredBookings() {
        try {
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
            const expiredBookings = await this.bookingModel.find({
                status: 'pending',
                pendingExpiresAt: { $lte: new Date() },
                isReceiptUploaded: { $ne: true },
            }).exec();
            for (const booking of expiredBookings) {
                if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
                    await this.eventModel.findByIdAndUpdate(booking.eventId, {
                        $pull: { bookedSeats: { bookingId: booking._id } },
                        $inc: { remainingTickets: booking.numberOfTickets },
                    });
                }
                else {
                    await this.eventModel.findByIdAndUpdate(booking.eventId, {
                        $inc: { remainingTickets: booking.numberOfTickets },
                    });
                }
                await this.bookingModel.findByIdAndDelete(booking._id).exec();
                this.logger.log(`Expired pending booking ${booking._id} cleaned up`);
            }
        }
        catch (err) {
            this.logger.error('Error cleaning up expired bookings/holds', err);
        }
    }
    async holdSeats(eventId, seats, userId) {
        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (!event.hasTheaterSeating) {
            throw new common_1.BadRequestException('This event does not have theater seating');
        }
        if (!seats || seats.length === 0) {
            throw new common_1.BadRequestException('No seats selected');
        }
        if (seats.length > 10) {
            throw new common_1.BadRequestException('Cannot hold more than 10 seats at once');
        }
        await this.releaseUserHolds(eventId, userId);
        const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
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
        const result = await this.eventModel.findOneAndUpdate({
            _id: eventId,
            $nor: seatConditions,
        }, {
            $push: { bookedSeats: { $each: holdEntries } },
            $inc: { remainingTickets: -normalizedSeats.length },
        }, { new: true });
        if (!result) {
            await this.seatHoldModel.findByIdAndDelete(savedHold._id).exec();
            const currentEvent = await this.eventModel.findById(eventId).exec();
            const bookedSet = new Set((currentEvent?.bookedSeats || []).map((s) => `${s.section}-${s.row}-${s.seatNumber}`));
            const conflicting = normalizedSeats
                .filter(s => bookedSet.has(`${s.section}-${s.row}-${s.seatNumber}`))
                .map(s => `${s.row}${s.seatNumber}`);
            throw new common_1.BadRequestException(`Seats no longer available: ${conflicting.join(', ')}`);
        }
        return {
            holdId: savedHold._id.toString(),
            expiresAt: holdExpiresAt,
            seats: normalizedSeats,
        };
    }
    async releaseHold(holdId, userId) {
        const hold = await this.seatHoldModel.findById(holdId).exec();
        if (!hold) {
            return;
        }
        if (hold.userId.toString() !== userId.toString()) {
            throw new common_1.ForbiddenException('You cannot release this hold');
        }
        await this.eventModel.findByIdAndUpdate(hold.eventId, {
            $pull: { bookedSeats: { holdId: hold._id } },
            $inc: { remainingTickets: hold.seats.length },
        });
        await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
    }
    async releaseUserHolds(eventId, userId) {
        const existingHolds = await this.seatHoldModel.find({
            eventId,
            userId,
        }).exec();
        for (const hold of existingHolds) {
            await this.eventModel.findByIdAndUpdate(hold.eventId, {
                $pull: { bookedSeats: { holdId: hold._id } },
                $inc: { remainingTickets: hold.seats.length },
            });
            await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
        }
    }
    async create(createDto, userId) {
        const { eventId, numberOfTickets, status, selectedSeats, holdId } = createDto;
        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        let totalPrice = 0;
        const bookingData = {
            StandardId: userId,
            eventId,
            status: 'pending',
            pendingExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
        if (event.hasTheaterSeating && selectedSeats && selectedSeats.length > 0) {
            let hold = null;
            if (holdId) {
                hold = await this.seatHoldModel.findById(holdId).exec();
                if (!hold) {
                    throw new common_1.BadRequestException('Seat hold expired or not found. Please select seats again.');
                }
                if (hold.userId.toString() !== userId.toString()) {
                    throw new common_1.ForbiddenException('This hold does not belong to you');
                }
                if (hold.eventId.toString() !== eventId.toString()) {
                    throw new common_1.BadRequestException('Hold does not match this event');
                }
                if (new Date() > hold.expiresAt) {
                    await this.eventModel.findByIdAndUpdate(hold.eventId, {
                        $pull: { bookedSeats: { holdId: hold._id } },
                        $inc: { remainingTickets: hold.seats.length },
                    });
                    await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
                    throw new common_1.BadRequestException('Seat hold has expired. Please select seats again.');
                }
                const holdSeatKeys = new Set(hold.seats.map((s) => `${s.section || 'main'}-${s.row}-${s.seatNumber}`));
                for (const seat of selectedSeats) {
                    const key = `${seat.section || 'main'}-${seat.row}-${seat.seatNumber}`;
                    if (!holdSeatKeys.has(key)) {
                        throw new common_1.BadRequestException(`Seat ${seat.row}${seat.seatNumber} is not in your hold. Please select seats again.`);
                    }
                }
            }
            else {
                const seatConditions = selectedSeats.map((seat) => ({
                    bookedSeats: {
                        $elemMatch: {
                            row: String(seat.row),
                            seatNumber: Number(seat.seatNumber),
                            section: seat.section || 'main',
                        },
                    },
                }));
                const unavailableSeats = [];
                for (const seat of selectedSeats) {
                    const isBooked = event.bookedSeats.some((bs) => bs.row === String(seat.row) &&
                        bs.seatNumber === Number(seat.seatNumber) &&
                        (bs.section || 'main') === (seat.section || 'main'));
                    if (isBooked) {
                        unavailableSeats.push(`${seat.row}${seat.seatNumber}`);
                    }
                }
                if (unavailableSeats.length > 0) {
                    throw new common_1.BadRequestException(`Seats already booked: ${unavailableSeats.join(', ')}`);
                }
            }
            const theater = await this.theaterModel.findById(event.theater).exec();
            if (!theater) {
                throw new common_1.NotFoundException('Theater not found for this event');
            }
            const mergedSeatConfig = [...(theater.seatConfig || [])];
            if (event.seatConfig && event.seatConfig.length > 0) {
                event.seatConfig.forEach((eventSeat) => {
                    const existingIdx = mergedSeatConfig.findIndex((ts) => String(ts.row).trim().toLowerCase() === String(eventSeat.row).trim().toLowerCase() &&
                        Number(ts.seatNumber) === Number(eventSeat.seatNumber) &&
                        (String(ts.section || 'main').toLowerCase()) === (String(eventSeat.section || 'main').toLowerCase()));
                    if (existingIdx >= 0) {
                        mergedSeatConfig[existingIdx] = eventSeat;
                    }
                    else {
                        mergedSeatConfig.push(eventSeat);
                    }
                });
            }
            const seatsWithPrices = selectedSeats.map((seat) => {
                const seatConfig = mergedSeatConfig.find((s) => String(s.row).trim().toLowerCase() === String(seat.row).trim().toLowerCase() &&
                    Number(s.seatNumber) === Number(seat.seatNumber) &&
                    (String(s.section || 'main').toLowerCase()) === (String(seat.section || 'main').toLowerCase()));
                const seatType = (seatConfig?.seatType || 'standard').toLowerCase();
                const pricing = event.seatPricing.find((p) => String(p.seatType).toLowerCase() === seatType);
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
            totalPrice = seatsWithPrices.reduce((sum, seat) => sum + seat.price, 0);
            bookingData.hasTheaterSeating = true;
            bookingData.selectedSeats = seatsWithPrices;
            bookingData.numberOfTickets = selectedSeats.length;
            bookingData.totalPrice = totalPrice;
            const booking = new this.bookingModel(bookingData);
            const savedBooking = await booking.save();
            if (hold) {
                await this.eventModel.findByIdAndUpdate(eventId, {
                    $pull: { bookedSeats: { holdId: hold._id } },
                });
                const seatUpdates = seatsWithPrices.map((seat) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    bookingId: savedBooking._id,
                }));
                await this.eventModel.findByIdAndUpdate(eventId, {
                    $push: { bookedSeats: { $each: seatUpdates } },
                });
                await this.seatHoldModel.findByIdAndDelete(hold._id).exec();
            }
            else {
                const seatUpdates = seatsWithPrices.map((seat) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    bookingId: savedBooking._id,
                }));
                const atomicSeatConditions = seatsWithPrices.map((seat) => ({
                    bookedSeats: {
                        $elemMatch: {
                            row: seat.row,
                            seatNumber: seat.seatNumber,
                            section: seat.section,
                        },
                    },
                }));
                const atomicResult = await this.eventModel.findOneAndUpdate({
                    _id: eventId,
                    $nor: atomicSeatConditions,
                }, {
                    $push: { bookedSeats: { $each: seatUpdates } },
                    $inc: { remainingTickets: -selectedSeats.length },
                }, { new: true });
                if (!atomicResult) {
                    await this.bookingModel.findByIdAndDelete(savedBooking._id).exec();
                    throw new common_1.BadRequestException('Some seats were just booked by another user. Please refresh and try again.');
                }
            }
            return savedBooking;
        }
        else {
            if (!numberOfTickets || numberOfTickets < 1) {
                throw new common_1.BadRequestException('Number of tickets is required');
            }
            if (event.remainingTickets < numberOfTickets) {
                throw new common_1.BadRequestException('Not enough tickets available');
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
    async findOne(id) {
        const booking = await this.bookingModel
            .findById(id)
            .populate({
            path: 'eventId',
            populate: {
                path: 'organizerId',
                select: 'name instapayNumber instapayQR'
            }
        })
            .exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        return booking;
    }
    async findAllForUser(userId) {
        return this.bookingModel
            .find({ StandardId: userId })
            .populate({
            path: 'eventId',
            populate: {
                path: 'organizerId',
                select: 'name instapayNumber instapayQR'
            }
        })
            .sort({ createdAt: -1 })
            .exec();
    }
    async delete(id, userId) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.StandardId.toString() !== userId.toString()) {
            throw new common_1.ForbiddenException('You are not authorised to cancel this booking');
        }
        if (booking.status === 'confirmed') {
            throw new common_1.BadRequestException('Cannot cancel a confirmed booking');
        }
        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: { bookedSeats: { bookingId: booking._id } },
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        }
        else {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        }
        await this.bookingModel.findByIdAndDelete(id).exec();
    }
    async findAllForEvent(eventId) {
        return this.bookingModel
            .find({ eventId })
            .populate('StandardId', 'name email phone')
            .sort({ createdAt: -1 })
            .exec();
    }
    async updateBookingStatus(bookingId, status, user) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (!['confirmed', 'rejected'].includes(status)) {
            throw new common_1.BadRequestException('Status must be confirmed or rejected');
        }
        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new common_1.ForbiddenException('Only the event organizer or an admin can update booking status');
        }
        if (status === 'rejected' && booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: { bookedSeats: { bookingId: booking._id } },
                $inc: { remainingTickets: booking.numberOfTickets },
            });
        }
        if (status === 'confirmed') {
            booking.pendingExpiresAt = null;
        }
        booking.status = status;
        const savedBooking = await booking.save();
        if (status === 'confirmed' && booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
            try {
                await this.ticketsService.generateTicketsForBooking(bookingId, booking.eventId.toString(), booking.StandardId.toString(), booking.selectedSeats.map((s) => ({
                    row: s.row,
                    seatNumber: s.seatNumber,
                    section: s.section || 'main',
                    seatType: s.seatType || 'standard',
                    price: s.price || 0,
                    attendeeName: s.attendeeName || '',
                    attendeePhone: s.attendeePhone || '',
                })));
                this.logger.log(`Generated ${booking.selectedSeats.length} QR tickets for booking ${bookingId}`);
            }
            catch (error) {
                this.logger.error(`Failed to generate QR tickets for booking ${bookingId}:`, error);
            }
        }
        return savedBooking;
    }
    async uploadReceipt(bookingId, userId, receiptBase64) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.StandardId.toString() !== userId.toString()) {
            throw new common_1.BadRequestException('You do not have permission to modify this booking');
        }
        if (booking.status !== 'pending') {
            throw new common_1.BadRequestException('Receipts can only be uploaded for pending bookings');
        }
        booking.instapayReceipt = receiptBase64;
        booking.isReceiptUploaded = true;
        booking.pendingExpiresAt = null;
        return booking.save();
    }
    async getAvailableSeats(eventId) {
        const event = await this.eventModel
            .findById(eventId)
            .populate('theater')
            .exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (!event.hasTheaterSeating || !event.theater) {
            throw new common_1.BadRequestException('This event does not have theater seating');
        }
        const theater = event.theater;
        const bookedSeatsSet = new Set(event.bookedSeats.map((s) => `${s.section}-${s.row}-${s.seatNumber}`));
        const [pendingBookings, activeHolds] = await Promise.all([
            this.bookingModel.find({
                eventId,
                status: 'pending',
            }).select('selectedSeats').lean().exec(),
            this.seatHoldModel.find({
                eventId,
                expiresAt: { $gt: new Date() },
            }).select('seats').lean().exec(),
        ]);
        const pendingSeatsSet = new Set();
        for (const pb of pendingBookings) {
            if (pb.selectedSeats) {
                for (const s of pb.selectedSeats) {
                    pendingSeatsSet.add(`${s.section}-${s.row}-${s.seatNumber}`);
                }
            }
        }
        const heldSeatsSet = new Set();
        for (const hold of activeHolds) {
            for (const s of hold.seats) {
                heldSeatsSet.add(`${(s.section || 'main')}-${s.row}-${s.seatNumber}`);
            }
        }
        const mergedSeatConfig = [...(theater.seatConfig || [])];
        if (event.seatConfig && event.seatConfig.length > 0) {
            event.seatConfig.forEach((eventSeat) => {
                const existingIdx = mergedSeatConfig.findIndex((ts) => String(ts.row).trim().toLowerCase() === String(eventSeat.row).trim().toLowerCase() &&
                    Number(ts.seatNumber) === Number(eventSeat.seatNumber) &&
                    (String(ts.section || 'main').toLowerCase()) === (String(eventSeat.section || 'main').toLowerCase()));
                if (existingIdx >= 0) {
                    mergedSeatConfig[existingIdx] = eventSeat;
                }
                else {
                    mergedSeatConfig.push(eventSeat);
                }
            });
        }
        const allSeats = [];
        const removedSeatsSet = new Set(theater.layout.removedSeats || []);
        const disabledSeatsSet = new Set(theater.layout.disabledSeats || []);
        const mainRows = theater.layout.mainFloor.rows;
        const mainRowLabels = theater.layout.mainFloor.rowLabels || [];
        for (let r = 0; r < mainRows; r++) {
            const rowLabel = mainRowLabels[r] || String.fromCharCode(65 + r);
            for (let s = 1; s <= theater.layout.mainFloor.seatsPerRow; s++) {
                const seatKey = `main-${rowLabel}-${s}`;
                if (removedSeatsSet.has(seatKey))
                    continue;
                const seatConfig = mergedSeatConfig.find((sc) => String(sc.row).trim().toLowerCase() === String(rowLabel).trim().toLowerCase() &&
                    Number(sc.seatNumber) === Number(s) &&
                    (String(sc.section || 'main').toLowerCase()) === 'main');
                const isDisabled = disabledSeatsSet.has(seatKey);
                const isActive = !isDisabled && seatConfig?.isActive !== false;
                const seatType = (seatConfig?.seatType || 'standard').toLowerCase();
                const pricingRecord = event.seatPricing.find((p) => String(p.seatType).toLowerCase() === seatType);
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
        if (theater.layout.hasBalcony && theater.layout.balcony.rows > 0) {
            const balcRows = theater.layout.balcony.rows;
            const balcRowLabels = theater.layout.balcony.rowLabels || [];
            for (let r = 0; r < balcRows; r++) {
                const rowLabel = balcRowLabels[r] || `BALC-${String.fromCharCode(65 + r)}`;
                for (let s = 1; s <= theater.layout.balcony.seatsPerRow; s++) {
                    const seatKey = `balcony-${rowLabel}-${s}`;
                    if (removedSeatsSet.has(seatKey))
                        continue;
                    const seatConfig = mergedSeatConfig.find((sc) => String(sc.row).trim().toLowerCase() === String(rowLabel).trim().toLowerCase() &&
                        Number(sc.seatNumber) === Number(s) &&
                        (String(sc.section || 'main').toLowerCase()) === 'balcony');
                    const isDisabled = disabledSeatsSet.has(seatKey);
                    const isActive = !isDisabled && seatConfig?.isActive !== false;
                    const seatType = (seatConfig?.seatType || 'standard').toLowerCase();
                    const pricingRecord = event.seatPricing.find((p) => String(p.seatType).toLowerCase() === seatType);
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
    async cancelSelectedSeats(bookingId, userId, seatKeys, cancelAll) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.StandardId.toString() !== userId.toString()) {
            throw new common_1.ForbiddenException('You are not authorised to modify this booking');
        }
        if (booking.status !== 'pending') {
            throw new common_1.BadRequestException('Can only cancel seats from a pending booking');
        }
        if (!booking.hasTheaterSeating || !booking.selectedSeats?.length) {
            await this.delete(bookingId, userId);
            return { message: 'Booking cancelled successfully' };
        }
        if (cancelAll || seatKeys.length >= booking.selectedSeats.length) {
            await this.delete(bookingId, userId);
            return { message: 'All seats cancelled. Booking removed.' };
        }
        const seatsToRemove = booking.selectedSeats.filter((s) => seatKeys.includes(`${s.section}-${s.row}-${s.seatNumber}`));
        if (seatsToRemove.length === 0) {
            throw new common_1.BadRequestException('No matching seats found to cancel');
        }
        const seatKeysToRemove = new Set(seatsToRemove.map((s) => `${s.section}-${s.row}-${s.seatNumber}`));
        const remainingSeats = booking.selectedSeats.filter((s) => !seatKeysToRemove.has(`${s.section}-${s.row}-${s.seatNumber}`));
        const removedPrice = seatsToRemove.reduce((sum, s) => sum + (s.price || 0), 0);
        for (const seat of seatsToRemove) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: {
                    bookedSeats: {
                        row: seat.row,
                        seatNumber: seat.seatNumber,
                        section: seat.section,
                        bookingId: booking._id,
                    },
                },
                $inc: { remainingTickets: 1 },
            });
        }
        booking.selectedSeats = remainingSeats;
        booking.numberOfTickets = remainingSeats.length;
        booking.totalPrice = booking.totalPrice - removedPrice;
        const savedBooking = await booking.save();
        return {
            message: `${seatsToRemove.length} seat(s) cancelled successfully`,
            booking: savedBooking,
        };
    }
    async requestCancellation(bookingId, userId, seatKeys, cancelAll, reason) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.StandardId.toString() !== userId.toString()) {
            throw new common_1.ForbiddenException('You are not authorised to modify this booking');
        }
        const isConfirmed = booking.status === 'confirmed';
        const isPendingWithReceipt = booking.status === 'pending' && booking.isReceiptUploaded === true;
        if (!isConfirmed && !isPendingWithReceipt) {
            throw new common_1.BadRequestException('Can only request cancellation for confirmed bookings or pending bookings with receipt uploaded');
        }
        const scannedTickets = await this.ticketsService.getScannedSeatsForBooking(bookingId);
        const scannedKeys = new Set(scannedTickets.map((t) => `${t.section}-${t.seatRow}-${t.seatNumber}`));
        const newSeatsToCancel = (cancelAll
            ? booking.selectedSeats.map((s) => ({
                row: s.row,
                seatNumber: s.seatNumber,
                section: s.section || 'main',
            }))
            : seatKeys.map((key) => {
                const [section, row, seatNum] = key.split('-');
                return { section, row, seatNumber: parseInt(seatNum, 10) };
            })).filter((s) => !scannedKeys.has(`${s.section}-${s.row}-${s.seatNumber}`));
        if (newSeatsToCancel.length === 0) {
            throw new common_1.BadRequestException('All selected seats have already been scanned and cannot be cancelled');
        }
        if (booking.cancellationRequest?.status === 'pending') {
            const existingKeys = new Set((booking.cancellationRequest.seatsToCancel || []).map((s) => `${s.section}-${s.row}-${s.seatNumber}`));
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
                seatsToCancel: merged,
                cancelAll: isCancelAll,
            };
            return booking.save();
        }
        booking.cancellationRequest = {
            status: 'pending',
            requestedAt: new Date(),
            reason: reason || '',
            seatsToCancel: newSeatsToCancel,
            cancelAll,
        };
        return booking.save();
    }
    async getCancellationRequests(eventId) {
        return this.bookingModel
            .find({
            eventId,
            'cancellationRequest.status': 'pending',
        })
            .populate('StandardId', 'name email phone')
            .sort({ 'cancellationRequest.requestedAt': -1 })
            .exec();
    }
    async approveCancellation(bookingId, user) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new common_1.ForbiddenException('Only the event organizer or an admin can approve cancellations');
        }
        if (booking.cancellationRequest?.status !== 'pending') {
            throw new common_1.BadRequestException('No pending cancellation request found');
        }
        const cancelAll = booking.cancellationRequest.cancelAll;
        const seatsToCancel = booking.cancellationRequest.seatsToCancel || [];
        if (cancelAll || seatsToCancel.length >= booking.selectedSeats.length) {
            if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
                await this.eventModel.findByIdAndUpdate(booking.eventId, {
                    $pull: { bookedSeats: { bookingId: booking._id } },
                    $inc: { remainingTickets: booking.numberOfTickets },
                });
            }
            else {
                await this.eventModel.findByIdAndUpdate(booking.eventId, {
                    $inc: { remainingTickets: booking.numberOfTickets },
                });
            }
            try {
                await this.ticketsService.deleteTicketsForBooking(bookingId);
            }
            catch (err) {
                this.logger.error(`Error deleting tickets for booking ${bookingId}:`, err);
            }
            booking.status = 'canceled';
            booking.cancellationRequest = {
                status: 'approved',
                requestedAt: booking.cancellationRequest.requestedAt,
                reason: booking.cancellationRequest.reason,
                seatsToCancel: seatsToCancel,
                cancelAll: true,
            };
            return booking.save();
        }
        const seatKeysToCancel = new Set(seatsToCancel.map((s) => `${s.section}-${s.row}-${s.seatNumber}`));
        for (const seat of seatsToCancel) {
            await this.eventModel.findByIdAndUpdate(booking.eventId, {
                $pull: {
                    bookedSeats: {
                        row: seat.row,
                        seatNumber: seat.seatNumber,
                        section: seat.section,
                        bookingId: booking._id,
                    },
                },
                $inc: { remainingTickets: 1 },
            });
        }
        try {
            await this.ticketsService.deleteTicketsForSeats(bookingId, seatsToCancel.map((s) => ({
                row: s.row,
                seatNumber: s.seatNumber,
                section: s.section,
            })));
        }
        catch (err) {
            this.logger.error(`Error deleting tickets for partial cancellation of booking ${bookingId}:`, err);
        }
        const removedPrice = booking.selectedSeats
            .filter((s) => seatKeysToCancel.has(`${s.section}-${s.row}-${s.seatNumber}`))
            .reduce((sum, s) => sum + (s.price || 0), 0);
        const remainingSeats = booking.selectedSeats.filter((s) => !seatKeysToCancel.has(`${s.section}-${s.row}-${s.seatNumber}`));
        booking.selectedSeats = remainingSeats;
        booking.numberOfTickets = remainingSeats.length;
        booking.totalPrice = booking.totalPrice - removedPrice;
        booking.cancellationRequest = {
            status: 'none',
            requestedAt: null,
            reason: '',
            seatsToCancel: [],
            cancelAll: false,
        };
        return booking.save();
    }
    async rejectCancellation(bookingId, user) {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        const event = await this.eventModel.findById(booking.eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        const isAdmin = user.role === 'System Admin';
        const isOrganizer = event.organizerId.toString() === user._id.toString();
        if (!isAdmin && !isOrganizer) {
            throw new common_1.ForbiddenException('Only the event organizer or an admin can reject cancellations');
        }
        if (booking.cancellationRequest?.status !== 'pending') {
            throw new common_1.BadRequestException('No pending cancellation request found');
        }
        booking.cancellationRequest = {
            status: 'rejected',
            requestedAt: booking.cancellationRequest.requestedAt,
            reason: booking.cancellationRequest.reason,
            seatsToCancel: booking.cancellationRequest.seatsToCancel,
            cancelAll: booking.cancellationRequest.cancelAll,
        };
        return booking.save();
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = BookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __param(1, (0, mongoose_1.InjectModel)(seat_hold_schema_1.SeatHold.name)),
    __param(2, (0, mongoose_1.InjectModel)(event_schema_1.Event.name)),
    __param(3, (0, mongoose_1.InjectModel)(theater_schema_1.Theater.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        tickets_service_1.TicketsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map