import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Seat info
  @Prop({ required: true })
  seatRow: string;

  @Prop({ required: true })
  seatNumber: number;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true })
  seatType: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: '' })
  attendeeFirstName: string;

  @Prop({ default: '' })
  attendeeLastName: string;

  @Prop({ default: '' })
  attendeePhone: string;

  @Prop({ default: '' })
  seatLabel: string;

  // QR code
  @Prop({ required: true })
  qrData: string; // unique identifier encoded in QR

  @Prop({ required: true })
  qrCodeImage: string; // base64 data URL of QR image

  // Scan tracking
  @Prop({ default: false })
  isScanned: boolean;

  @Prop({ type: Date, default: null })
  scannedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  scannedBy: Types.ObjectId | null;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Index for fast lookup by QR data
TicketSchema.index({ qrData: 1 }, { unique: true });
TicketSchema.index({ bookingId: 1 });
TicketSchema.index({ eventId: 1 });
