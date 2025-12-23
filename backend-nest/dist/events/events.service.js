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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_schema_1 = require("./schemas/event.schema");
const booking_schema_1 = require("../bookings/schemas/booking.schema");
const mail_service_1 = require("../mail/mail.service");
const user_schema_1 = require("../users/schemas/user.schema");
let EventsService = class EventsService {
    eventModel;
    bookingModel;
    mailService;
    constructor(eventModel, bookingModel, mailService) {
        this.eventModel = eventModel;
        this.bookingModel = bookingModel;
        this.mailService = mailService;
    }
    async create(createDto, userId, role) {
        if (role !== user_schema_1.UserRole.ORGANIZER) {
            throw new common_1.ForbiddenException('Only organizers can create events');
        }
        const { title, description, date, location, category, ticketPrice, totalTickets, image, theater, hasTheaterSeating, seatPricing, seatConfig, } = createDto;
        const event = new this.eventModel({
            organizerId: userId,
            title,
            description,
            date,
            location,
            category,
            ticketPrice,
            totalTickets,
            remainingTickets: totalTickets,
            image: image || 'default-image.jpg',
            theater: hasTheaterSeating === 'true' || hasTheaterSeating === true ? theater : null,
            hasTheaterSeating: hasTheaterSeating === 'true' || hasTheaterSeating === true,
            seatPricing: typeof seatPricing === 'string' ? JSON.parse(seatPricing) : seatPricing || [],
            seatConfig: typeof seatConfig === 'string' ? JSON.parse(seatConfig) : seatConfig || [],
        });
        return event.save();
    }
    async findAllApproved() {
        return this.eventModel.find({ status: 'approved' }).exec();
    }
    async findAll() {
        return this.eventModel.find().exec();
    }
    async findOne(id) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        return event;
    }
    async update(id, updateDto) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.status === 'approved' &&
            updateDto.status &&
            updateDto.status !== 'approved') {
            const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id });
            if (bookingCount > 0) {
                throw new common_1.BadRequestException(`Cannot revoke event with ${bookingCount} existing booking(s). Please cancel all bookings first.`);
            }
        }
        if (updateDto.hasTheaterSeating !== undefined) {
            updateDto.hasTheaterSeating =
                updateDto.hasTheaterSeating === 'true' ||
                    updateDto.hasTheaterSeating === true;
        }
        if (updateDto.seatPricing && typeof updateDto.seatPricing === 'string') {
            try {
                updateDto.seatPricing = JSON.parse(updateDto.seatPricing);
            }
            catch (e) { }
        }
        if (updateDto.seatConfig && typeof updateDto.seatConfig === 'string') {
            try {
                updateDto.seatConfig = JSON.parse(updateDto.seatConfig);
            }
            catch (e) { }
        }
        Object.assign(event, updateDto);
        return event.save();
    }
    async requestDeletionOTP(id, user) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.status !== 'approved') {
            throw new common_1.BadRequestException('OTP verification is only required for approved events');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        event.otp = otp;
        event.otpExpires = otpExpires;
        await event.save();
        await this.mailService.sendVerificationOTP(user.email, otp);
    }
    async verifyDeletionOTP(id, otp) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (!event.otp ||
            event.otp !== otp ||
            !event.otpExpires ||
            event.otpExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id });
        if (bookingCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete event with ${bookingCount} existing booking(s). Please cancel all bookings first.`);
        }
        await this.bookingModel.deleteMany({ eventId: event._id }).exec();
        await this.eventModel.deleteOne({ _id: event._id }).exec();
    }
    async delete(id) {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.status === 'approved') {
            throw new common_1.BadRequestException('Approved events require OTP verification. Please use the OTP verification endpoint.');
        }
        const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id });
        if (bookingCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete event with ${bookingCount} existing booking(s). Please cancel all bookings first.`);
        }
        await this.bookingModel.deleteMany({ eventId: event._id }).exec();
        await this.eventModel.deleteOne({ _id: event._id }).exec();
    }
    async findByOrganizer(organizerId) {
        return this.eventModel.find({ organizerId }).exec();
    }
    async getOrganizerAnalytics(organizerId) {
        const events = await this.eventModel.find({ organizerId }).exec();
        if (events.length === 0) {
            return {
                totalEvents: 0,
                totalRevenue: 0,
                averageSoldPercentage: '0.00',
                events: [],
            };
        }
        const analytics = events.map((event) => {
            const ticketsSold = event.totalTickets - event.remainingTickets;
            const percentageSold = (ticketsSold / event.totalTickets) * 100;
            return {
                eventId: event._id,
                eventTitle: event.title,
                totalTickets: event.totalTickets,
                ticketsSold: ticketsSold,
                ticketsAvailable: event.remainingTickets,
                percentageSold: percentageSold.toFixed(2),
                revenue: ticketsSold * event.ticketPrice,
            };
        });
        const totalRevenue = analytics.reduce((sum, item) => sum + item.revenue, 0);
        const averageSoldPercentage = analytics.reduce((sum, item) => sum + parseFloat(item.percentageSold), 0) /
            analytics.length;
        return {
            totalEvents: analytics.length,
            totalRevenue: totalRevenue,
            averageSoldPercentage: averageSoldPercentage.toFixed(2),
            events: analytics.sort((a, b) => parseFloat(b.percentageSold) - parseFloat(a.percentageSold)),
        };
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(event_schema_1.Event.name)),
    __param(1, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mail_service_1.MailService])
], EventsService);
//# sourceMappingURL=events.service.js.map