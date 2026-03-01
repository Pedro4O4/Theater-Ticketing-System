import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/booking')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createDto: any, @Req() req: any) {
        const data = await this.bookingsService.create(createDto, req.user._id);
        return { success: true, data };
    }

    @Get('my-bookings')
    @UseGuards(JwtAuthGuard)
    async findAllForUser(@Req() req: any) {
        const data = await this.bookingsService.findAllForUser(req.user._id);
        return { success: true, count: data.length, data };
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        const data = await this.bookingsService.findOne(id);
        return { success: true, data };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        await this.bookingsService.delete(id);
        return { success: true, message: 'Booking deleted successfully' };
    }

    @Get('availability/:eventId')
    async getAvailableSeats(@Param('eventId') eventId: string) {
        const data = await this.bookingsService.getAvailableSeats(eventId);
        return { success: true, data };
    }

    // Alias route for frontend compatibility
    @Get('event/:eventId/seats')
    async getEventSeats(@Param('eventId') eventId: string) {
        const data = await this.bookingsService.getAvailableSeats(eventId);
        return { success: true, data };
    }

    // Organizer: get all bookings for their event
    @Get('event/:eventId/bookings')
    @UseGuards(JwtAuthGuard)
    async getEventBookings(@Param('eventId') eventId: string) {
        const data = await this.bookingsService.findAllForEvent(eventId);
        return { success: true, count: data.length, data };
    }

    // Organizer: approve or reject a booking
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateBookingStatus(
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        const data = await this.bookingsService.updateBookingStatus(id, status);
        return { success: true, data };
    }
}
