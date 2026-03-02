import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { Ticket, TicketDocument } from './schemas/ticket.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectModel(Ticket.name)
    private ticketModel: Model<TicketDocument>,
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
  ) {}

  /**
   * Generate tickets with QR codes for a confirmed booking.
   * Called when organizer approves payment.
   */
  async generateTicketsForBooking(
    bookingId: string,
    eventId: string,
    userId: string,
    selectedSeats: Array<{
      row: string;
      seatNumber: number;
      section: string;
      seatType: string;
      price: number;
      attendeeName?: string;
      attendeePhone?: string;
    }>,
  ): Promise<TicketDocument[]> {
    // Check if tickets already exist for this booking
    const existing = await this.ticketModel
      .find({ bookingId: new Types.ObjectId(bookingId) })
      .exec();
    if (existing.length > 0) {
      return existing;
    }

    const tickets: TicketDocument[] = [];

    for (const seat of selectedSeats) {
      // Generate a unique QR data string
      const qrData = `TICKET-${bookingId}-${seat.section}-${seat.row}-${seat.seatNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Generate QR code as base64 data URL
      const qrCodeImage = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      const ticket = new this.ticketModel({
        bookingId: new Types.ObjectId(bookingId),
        eventId: new Types.ObjectId(eventId),
        userId: new Types.ObjectId(userId),
        seatRow: seat.row,
        seatNumber: seat.seatNumber,
        section: seat.section,
        seatType: seat.seatType,
        price: seat.price,
        attendeeName: seat.attendeeName || '',
        attendeePhone: seat.attendeePhone || '',
        qrData,
        qrCodeImage,
        isScanned: false,
        scannedAt: null,
        scannedBy: null,
      });

      const savedTicket = await ticket.save();
      tickets.push(savedTicket);
    }

    return tickets;
  }

  /**
   * Get all tickets for a specific booking (for user to download).
   * Auto-generates tickets if the booking is confirmed but tickets don't exist yet.
   */
  async getTicketsByBooking(bookingId: string): Promise<TicketDocument[]> {
    let tickets = await this.ticketModel
      .find({ bookingId: new Types.ObjectId(bookingId) })
      .populate('eventId', 'title date location')
      .populate('userId', 'name email phone')
      .exec();

    // If no tickets exist, check if booking is confirmed and auto-generate
    if (tickets.length === 0) {
      const booking = await this.bookingModel.findById(bookingId).exec();
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== 'confirmed') {
        return []; // Only generate for confirmed bookings
      }

      if (booking.hasTheaterSeating && booking.selectedSeats?.length > 0) {
        this.logger.log(`Auto-generating QR tickets for confirmed booking ${bookingId}`);
        await this.generateTicketsForBooking(
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

        // Re-fetch with populated fields
        tickets = await this.ticketModel
          .find({ bookingId: new Types.ObjectId(bookingId) })
          .populate('eventId', 'title date location')
          .populate('userId', 'name email phone')
          .exec();
      }
    }

    return tickets;
  }

  /**
   * Get all tickets for an event (for organizer).
   */
  async getTicketsByEvent(eventId: string): Promise<TicketDocument[]> {
    return this.ticketModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .populate('userId', 'name email phone')
      .populate('bookingId', 'status totalPrice')
      .exec();
  }

  /**
   * Scan a QR code - returns ticket details and marks as scanned.
   * If already scanned, returns info but flags it as not free.
   */
  async scanTicket(
    qrData: string,
    scannedByUserId: string,
  ): Promise<{
    ticket: TicketDocument;
    userEmail: string;
    userPhone: string;
    userName: string;
    seatRow: string;
    seatNumber: number;
    section: string;
    seatType: string;
    attendeeName: string;
    attendeePhone: string;
    isFree: boolean;
    message: string;
  }> {
    const ticket = await this.ticketModel
      .findOne({ qrData })
      .populate('userId', 'name email phone')
      .populate('eventId', 'title date location')
      .populate('bookingId', 'status')
      .exec();

    if (!ticket) {
      throw new NotFoundException('Invalid QR code - no ticket found');
    }

    // Check if booking is confirmed
    const booking = ticket.bookingId as any;
    if (booking && booking.status !== 'confirmed') {
      throw new BadRequestException(
        `This ticket belongs to a ${booking.status} booking`,
      );
    }

    const user = ticket.userId as any;

    if (ticket.isScanned) {
      // Already scanned - not free
      return {
        ticket,
        userEmail: user?.email || '',
        userPhone: user?.phone || '',
        userName: user?.name || '',
        seatRow: ticket.seatRow,
        seatNumber: ticket.seatNumber,
        section: ticket.section,
        seatType: ticket.seatType,
        attendeeName: ticket.attendeeName,
        attendeePhone: ticket.attendeePhone,
        isFree: false,
        message: `⚠️ This ticket was already scanned on ${ticket.scannedAt?.toLocaleString()}. This seat is NOT free.`,
      };
    }

    // First scan - mark as scanned
    ticket.isScanned = true;
    ticket.scannedAt = new Date();
    ticket.scannedBy = new Types.ObjectId(scannedByUserId);
    await ticket.save();

    return {
      ticket,
      userEmail: user?.email || '',
      userPhone: user?.phone || '',
      userName: user?.name || '',
      seatRow: ticket.seatRow,
      seatNumber: ticket.seatNumber,
      section: ticket.section,
      seatType: ticket.seatType,
      attendeeName: ticket.attendeeName,
      attendeePhone: ticket.attendeePhone,
      isFree: true,
      message: '✅ Valid ticket! This is the first scan. Seat is free to enter.',
    };
  }

  /**
   * Get a single ticket by ID.
   */
  async getTicketById(ticketId: string): Promise<TicketDocument> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('eventId', 'title date location')
      .populate('userId', 'name email phone')
      .exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Get scan statistics for an event.
   */
  async getEventScanStats(eventId: string) {
    const total = await this.ticketModel
      .countDocuments({ eventId: new Types.ObjectId(eventId) })
      .exec();
    const scanned = await this.ticketModel
      .countDocuments({
        eventId: new Types.ObjectId(eventId),
        isScanned: true,
      })
      .exec();

    return {
      total,
      scanned,
      remaining: total - scanned,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0,
    };
  }
}
