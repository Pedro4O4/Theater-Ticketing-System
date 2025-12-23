import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name) private eventModel: Model<EventDocument>,
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
        private mailService: MailService,
    ) { }

    async create(createDto: any, userId: string, role: string): Promise<EventDocument> {
        if (role !== UserRole.ORGANIZER) {
            throw new ForbiddenException('Only organizers can create events');
        }

        const {
            title,
            description,
            date,
            location,
            category,
            ticketPrice,
            totalTickets,
            image,
            theater,
            hasTheaterSeating,
            seatPricing,
            seatConfig,
        } = createDto;

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

    async findAllApproved(): Promise<EventDocument[]> {
        return this.eventModel.find({ status: 'approved' }).exec();
    }

    async findAll(): Promise<EventDocument[]> {
        return this.eventModel.find().exec();
    }

    async findOne(id: string): Promise<EventDocument> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }
        return event;
    }

    async update(id: string, updateDto: any): Promise<EventDocument> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Prevent revoking an approved event if it has bookings
        if (
            event.status === 'approved' &&
            updateDto.status &&
            updateDto.status !== 'approved'
        ) {
            const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id } as any);
            if (bookingCount > 0) {
                throw new BadRequestException(
                    `Cannot revoke event with ${bookingCount} existing booking(s). Please cancel all bookings first.`
                );
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
            } catch (e) { }
        }

        if (updateDto.seatConfig && typeof updateDto.seatConfig === 'string') {
            try {
                updateDto.seatConfig = JSON.parse(updateDto.seatConfig);
            } catch (e) { }
        }

        Object.assign(event, updateDto);
        return event.save();
    }

    async requestDeletionOTP(id: string, user: any): Promise<void> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.status !== 'approved') {
            throw new BadRequestException(
                'OTP verification is only required for approved events',
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        event.otp = otp;
        event.otpExpires = otpExpires;
        await event.save();

        await this.mailService.sendVerificationOTP(user.email, otp);
    }

    async verifyDeletionOTP(id: string, otp: string): Promise<void> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (
            !event.otp ||
            event.otp !== otp ||
            !event.otpExpires ||
            event.otpExpires < new Date()
        ) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        // Check for existing bookings before deletion
        const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id } as any);
        if (bookingCount > 0) {
            throw new BadRequestException(
                `Cannot delete event with ${bookingCount} existing booking(s). Please cancel all bookings first.`
            );
        }

        await this.bookingModel.deleteMany({ eventId: event._id } as any).exec();
        await this.eventModel.deleteOne({ _id: event._id }).exec();
    }

    async delete(id: string): Promise<void> {
        const event = await this.eventModel.findById(id).exec();
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.status === 'approved') {
            throw new BadRequestException(
                'Approved events require OTP verification. Please use the OTP verification endpoint.',
            );
        }

        // Check for existing bookings before deletion
        const bookingCount = await this.bookingModel.countDocuments({ eventId: event._id } as any);
        if (bookingCount > 0) {
            throw new BadRequestException(
                `Cannot delete event with ${bookingCount} existing booking(s). Please cancel all bookings first.`
            );
        }

        await this.bookingModel.deleteMany({ eventId: event._id } as any).exec();
        await this.eventModel.deleteOne({ _id: event._id }).exec();
    }

    async findByOrganizer(organizerId: string): Promise<EventDocument[]> {
        return this.eventModel.find({ organizerId } as any).exec();
    }

    async getOrganizerAnalytics(organizerId: string): Promise<any> {
        const events = await this.eventModel.find({ organizerId } as any).exec();

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
        const averageSoldPercentage =
            analytics.reduce((sum, item) => sum + parseFloat(item.percentageSold), 0) /
            analytics.length;

        return {
            totalEvents: analytics.length,
            totalRevenue: totalRevenue,
            averageSoldPercentage: averageSoldPercentage.toFixed(2),
            events: analytics.sort((a, b) => parseFloat(b.percentageSold) - parseFloat(a.percentageSold)),
        };
    }
}
