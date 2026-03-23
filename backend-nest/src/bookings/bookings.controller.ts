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

    // ─── Seat Hold Endpoints ─────────────────────────────────────────

    @Post('hold-seats')
    @UseGuards(JwtAuthGuard)
    async holdSeats(
        @Body() body: { eventId: string; seats: { row: string; seatNumber: number; section: string }[] },
        @Req() req: any,
    ) {
        const data = await this.bookingsService.holdSeats(body.eventId, body.seats, req.user._id);
        return { success: true, data };
    }

    @Delete('hold-seats/:id')
    @UseGuards(JwtAuthGuard)
    async releaseHold(@Param('id') id: string, @Req() req: any) {
        await this.bookingsService.releaseHold(id, req.user._id);
        return { success: true, message: 'Hold released' };
    }

    @Get('active-hold/:eventId')
    @UseGuards(JwtAuthGuard)
    async getActiveHold(@Param('eventId') eventId: string, @Req() req: any) {
        const data = await this.bookingsService.findActiveHold(eventId, req.user._id);
        return { success: true, data };
    }

    // ─── Booking Endpoints ───────────────────────────────────────────

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

    @Get('user/:userId')
    @UseGuards(JwtAuthGuard)
    async findAllForSpecificUser(@Param('userId') userId: string, @Req() req: any) {
        // Here we could add RoleGuard to ensure Admin or Organizer,
        // but for now, we'll let the service handle authorization if needed
        const data = await this.bookingsService.findAllForSpecificUser(userId, req.user);
        return { success: true, count: data.length, data };
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        const data = await this.bookingsService.findOne(id);
        return { success: true, data };
    }

    @Get(':id/receipt')
    @UseGuards(JwtAuthGuard)
    async getReceipt(@Param('id') id: string) {
        const data = await this.bookingsService.findReceipt(id);
        return { success: true, data };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string, @Req() req: any) {
        await this.bookingsService.delete(id, req.user._id);
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

    // User: upload receipt for a pending booking
    @Post(':id/receipt')
    @UseGuards(JwtAuthGuard)
    async uploadReceipt(
        @Param('id') id: string,
        @Body('receiptBase64') receiptBase64: string,
        @Req() req: any
    ) {
        if (!receiptBase64) {
            return { success: false, message: 'Receipt image is required' };
        }
        const data = await this.bookingsService.uploadReceipt(id, req.user._id, receiptBase64);
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
        @Req() req: any,
    ) {
        const data = await this.bookingsService.updateBookingStatus(id, status, req.user);
        return { success: true, data };
    }

    // User: cancel selected seats from a pending booking
    @Post(':id/cancel-seats')
    @UseGuards(JwtAuthGuard)
    async cancelSelectedSeats(
        @Param('id') id: string,
        @Body() body: { seatKeys: string[]; cancelAll: boolean },
        @Req() req: any,
    ) {
        const result = await this.bookingsService.cancelSelectedSeats(
            id,
            req.user._id,
            body.seatKeys || [],
            body.cancelAll || false,
        );
        return { success: true, ...result };
    }

    // User: request cancellation for a confirmed booking
    @Post(':id/request-cancellation')
    @UseGuards(JwtAuthGuard)
    async requestCancellation(
        @Param('id') id: string,
        @Body() body: { seatKeys: string[]; cancelAll: boolean; reason: string },
        @Req() req: any,
    ) {
        const data = await this.bookingsService.requestCancellation(
            id,
            req.user._id,
            body.seatKeys || [],
            body.cancelAll || false,
            body.reason || '',
        );
        return { success: true, data };
    }

    // Organizer: get cancellation requests for their event
    @Get('event/:eventId/cancellation-requests')
    @UseGuards(JwtAuthGuard)
    async getCancellationRequests(@Param('eventId') eventId: string) {
        const data = await this.bookingsService.getCancellationRequests(eventId);
        return { success: true, count: data.length, data };
    }

    // Organizer: approve a cancellation request
    @Patch(':id/approve-cancellation')
    @UseGuards(JwtAuthGuard)
    async approveCancellation(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        const data = await this.bookingsService.approveCancellation(id, req.user);
        return { success: true, data };
    }

    // Organizer: reject a cancellation request
    @Patch(':id/reject-cancellation')
    @UseGuards(JwtAuthGuard)
    async rejectCancellation(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        const data = await this.bookingsService.rejectCancellation(id, req.user);
        return { success: true, data };
    }
}
