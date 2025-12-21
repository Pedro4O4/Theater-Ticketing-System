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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const booking_schema_1 = require("./schemas/booking.schema");
const event_schema_1 = require("../events/schemas/event.schema");
const theater_schema_1 = require("../theaters/schemas/theater.schema");
let BookingsService = class BookingsService {
    bookingModel;
    eventModel;
    theaterModel;
    constructor(bookingModel, eventModel, theaterModel) {
        this.bookingModel = bookingModel;
        this.eventModel = eventModel;
        this.theaterModel = theaterModel;
    }
    async create(createDto, userId) {
        const { eventId, numberOfTickets, status, selectedSeats } = createDto;
        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        let totalPrice = 0;
        const bookingData = {
            StandardId: userId,
            eventId,
            status: status || 'confirmed',
        };
        if (event.hasTheaterSeating && selectedSeats && selectedSeats.length > 0) {
            const unavailableSeats = [];
            for (const seat of selectedSeats) {
                const isBooked = event.bookedSeats.some((bs) => bs.row === seat.row &&
                    bs.seatNumber === seat.seatNumber &&
                    bs.section === seat.section);
                if (isBooked) {
                    unavailableSeats.push(`${seat.row}${seat.seatNumber}`);
                }
            }
            if (unavailableSeats.length > 0) {
                throw new common_1.BadRequestException(`Seats already booked: ${unavailableSeats.join(', ')}`);
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
                };
            });
            totalPrice = seatsWithPrices.reduce((sum, seat) => sum + seat.price, 0);
            bookingData.hasTheaterSeating = true;
            bookingData.selectedSeats = seatsWithPrices;
            bookingData.numberOfTickets = selectedSeats.length;
            bookingData.totalPrice = totalPrice;
            const booking = new this.bookingModel(bookingData);
            const savedBooking = await booking.save();
            const seatUpdates = seatsWithPrices.map((seat) => ({
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
            .populate('eventId')
            .exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        return booking;
    }
    async findAllForUser(userId) {
        return this.bookingModel
            .find({ StandardId: userId })
            .populate('eventId')
            .sort({ createdAt: -1 })
            .exec();
    }
    async delete(id) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
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
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __param(1, (0, mongoose_1.InjectModel)(event_schema_1.Event.name)),
    __param(2, (0, mongoose_1.InjectModel)(theater_schema_1.Theater.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map