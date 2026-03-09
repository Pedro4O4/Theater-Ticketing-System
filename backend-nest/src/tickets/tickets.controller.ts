import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { TicketsService } from './tickets.service';

@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  /**
   * GET /api/v1/tickets/booking/:bookingId
   * Get all tickets (QR codes) for a booking - for the user to view/download.
   */
  @UseGuards(JwtAuthGuard)
  @Get('booking/:bookingId')
  async getTicketsByBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: any,
  ) {
    const tickets = await this.ticketsService.getTicketsByBooking(bookingId);
    return { tickets };
  }

  /**
   * GET /api/v1/tickets/event/:eventId
   * Get all tickets for an event - for organizer.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.SCANNER)
  @Get('event/:eventId')
  async getTicketsByEvent(@Param('eventId') eventId: string) {
    const tickets = await this.ticketsService.getTicketsByEvent(eventId);
    return { tickets };
  }

  /**
   * POST /api/v1/tickets/scan
   * Scan a QR code at the theater entrance.
   * Body: { qrData: string }
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.SCANNER)
  @Post('scan')
  async scanTicket(@Body() body: { qrData: string; eventId?: string }, @Req() req: any) {
    const result = await this.ticketsService.scanTicket(body.qrData, req.user._id, body.eventId);
    return result;
  }

  /**
   * GET /api/v1/tickets/event/:eventId/stats
   * Get scan statistics for an event.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.SCANNER)
  @Get('event/:eventId/stats')
  async getEventScanStats(@Param('eventId') eventId: string) {
    return this.ticketsService.getEventScanStats(eventId);
  }

  /**
   * GET /api/v1/tickets/:ticketId
   * Get a single ticket by ID.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':ticketId')
  async getTicketById(@Param('ticketId') ticketId: string) {
    const ticket = await this.ticketsService.getTicketById(ticketId);
    return { ticket };
  }
}
