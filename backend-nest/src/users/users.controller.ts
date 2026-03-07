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
    Inject,
    forwardRef,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './schemas/user.schema';
import { EventsService } from '../events/events.service';
import { BookingsService } from '../bookings/bookings.service';

@Controller('api/v1/user')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => EventsService)) private readonly eventsService: EventsService,
        @Inject(forwardRef(() => BookingsService)) private readonly bookingsService: BookingsService,
    ) { }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req: any) {
        const data = await this.usersService.findById(req.user._id);
        return { success: true, data };
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Req() req: any, @Body() updateDto: any) {
        const data = await this.usersService.updateProfile(req.user._id, updateDto);
        return { success: true, data };
    }

    // Organizer: Get my events
    @Get('events')
    @UseGuards(JwtAuthGuard)
    async getMyEvents(@Req() req: any) {
        const data = await this.eventsService.findByOrganizer(req.user._id);
        return { success: true, data };
    }

    // Organizer: Get events analytics
    @Get('events/analytics')
    @UseGuards(JwtAuthGuard)
    async getMyEventsAnalytics(@Req() req: any) {
        const data = await this.eventsService.getOrganizerAnalytics(req.user._id);
        return data;
    }

    // User: Get my bookings
    @Get('bookings')
    @UseGuards(JwtAuthGuard)
    async getMyBookings(@Req() req: any) {
        const data = await this.bookingsService.findAllForUser(req.user._id);
        return { success: true, data };
    }

    // Admin routes
    @Get('all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll() {
        const data = await this.usersService.findAll();
        return { success: true, count: data.length, data };
    }

    // Admin-only: Create user with any role (Admin, Organizer, or Standard User)
    @Post('create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async createUser(@Body() createUserDto: any) {
        const data = await this.usersService.createUserByAdmin(createUserDto);
        return {
            success: true,
            message: 'User created successfully',
            data: {
                _id: data._id,
                name: data.name,
                email: data.email,
                role: data.role,
                isVerified: data.isVerified,
            }
        };
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findOne(@Param('id') id: string) {
        const data = await this.usersService.findById(id);
        return { success: true, data };
    }

    @Put(':id/role')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async updateRole(@Param('id') id: string, @Body('role') role: string) {
        const data = await this.usersService.updateRole(id, role);
        return { success: true, data };
    }

    @Put(':id/block')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async blockUser(@Param('id') id: string, @Body('isBlocked') isBlocked: boolean) {
        const data = await this.usersService.blockUser(id, isBlocked);
        return {
            success: true,
            message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
            data,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        await this.usersService.delete(id);
        return { success: true, message: 'User deleted successfully' };
    }
}
