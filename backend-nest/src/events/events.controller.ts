import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    ForbiddenException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/event')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Body() createDto: any,
        @Req() req: any,
    ) {
        // Image is expected to be sent as base64 string in createDto.image
        const data = await this.eventsService.create(createDto, req.user._id, req.user.role);
        return { success: true, data };
    }

    @Get('approved')
    async findAllApproved() {
        const data = await this.eventsService.findAllApproved();
        return { success: true, data };
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: any) {
        if (req.user.role !== 'System Admin') {
            throw new ForbiddenException('Only admins can view all events');
        }
        const data = await this.eventsService.findAll();
        return { success: true, data };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data = await this.eventsService.findOne(id);
        return { success: true, data };
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async update(
        @Param('id') id: string,
        @Body() updateDto: any,
    ) {
        // Image is expected to be sent as base64 string in updateDto.image
        const data = await this.eventsService.update(id, updateDto);
        return { success: true, data };
    }

    @Post(':id/request-deletion-otp')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async requestDeletionOTP(@Param('id') id: string, @Req() req: any) {
        await this.eventsService.requestDeletionOTP(id, req.user);
        return { success: true, message: 'OTP sent successfully' };
    }

    @Post('verify-deletion-otp')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async verifyDeletionOTP(@Body('eventId') eventId: string, @Body('otp') otp: string) {
        await this.eventsService.verifyDeletionOTP(eventId, otp);
        return { success: true, message: 'Event deleted successfully' };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        await this.eventsService.delete(id);
        return { success: true, message: 'Event deleted successfully' };
    }

    @Get('organizer/my-events')
    @UseGuards(JwtAuthGuard)
    async getMyEvents(@Req() req: any) {
        const data = await this.eventsService.findByOrganizer(req.user._id);
        return { success: true, data };
    }

    @Get('organizer/analytics')
    @UseGuards(JwtAuthGuard)
    async getOrganizerAnalytics(@Req() req: any) {
        const data = await this.eventsService.getOrganizerAnalytics(req.user._id);
        return { success: true, data };
    }
}
