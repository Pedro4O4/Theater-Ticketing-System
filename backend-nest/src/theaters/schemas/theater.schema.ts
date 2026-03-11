import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type TheaterDocument = Theater & Document;

@Schema({ _id: false })
class Stage {
    @Prop({ enum: ['top', 'bottom', 'left', 'right'], default: 'top' })
    position: string;

    @Prop({ default: 80, min: 20, max: 100 })
    width: number;

    @Prop({ default: 15, min: 5, max: 40 })
    height: number;
}

@Schema({ _id: false })
class FloorInfo {
    @Prop({ default: 0 })
    rows: number;

    @Prop({ default: 0 })
    seatsPerRow: number;

    @Prop({ type: [Number], default: [] })
    aislePositions: number[];

    @Prop({ type: [String], default: [] })
    rowLabels: string[];
}

@Schema({ _id: false })
class TheaterLayout {
    @Prop({ type: Stage, default: () => ({}) })
    stage: Stage;

    @Prop({ type: FloorInfo, default: () => ({}) })
    mainFloor: FloorInfo;

    @Prop({ default: false })
    hasBalcony: boolean;

    @Prop({ type: FloorInfo, default: null })
    balcony: FloorInfo;

    @Prop({ type: [String], default: [] })
    removedSeats: string[];

    @Prop({ type: [String], default: [] })
    disabledSeats: string[];

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    hCorridors: Record<string, number>;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    vCorridors: Record<string, number>;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    seatCategories: Record<string, string>;

    @Prop({
        type: [MongooseSchema.Types.Mixed],
        default: [],
    })
    labels: any[];
}

@Schema()
class SeatConfig {
    @Prop({ required: true })
    row: string;

    @Prop({ required: true })
    seatNumber: number;

    @Prop({
        enum: ['standard', 'vip', 'premium', 'wheelchair', 'disabled'],
        default: 'standard',
    })
    seatType: string;

    @Prop({ enum: ['main', 'balcony'], default: 'main' })
    section: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: '' })
    seatLabel: string;
}

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Theater {
    @Prop({ required: true, trim: true, maxlength: 100 })
    name: string;

    @Prop({ trim: true, maxlength: 500 })
    description: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: User | MongooseSchema.Types.ObjectId;

    @Prop({ type: TheaterLayout, required: true })
    layout: TheaterLayout;

    @Prop({ type: [SeatConfig] })
    seatConfig: SeatConfig[];

    @Prop({ default: 0 })
    totalSeats: number;

    @Prop({ default: 0 })
    vipSeats: number;

    @Prop({ default: 0 })
    premiumSeats: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: null })
    image: string;
}

export const TheaterSchema = SchemaFactory.createForClass(Theater);

// Pre-save hook
TheaterSchema.pre('save', async function (this: TheaterDocument) {
    const mainFloor = this.layout?.mainFloor;
    const balcony = this.layout?.balcony;

    const mainSeats = (mainFloor?.rows || 0) * (mainFloor?.seatsPerRow || 0);
    const balconySeats = (this.layout?.hasBalcony)
        ? (balcony?.rows || 0) * (balcony?.seatsPerRow || 0)
        : 0;

    const seatConfigs = this.seatConfig || [];

    // Subtract disabled seats (either explicit 'disabled' type or isActive = false)
    const disabledCount = seatConfigs.filter(
        (s) => !s.isActive || s.seatType === 'disabled',
    ).length;

    this.totalSeats = Math.max(0, mainSeats + balconySeats - disabledCount);

    // Count VIP and Premium seats correctly from the actual configuration
    this.vipSeats = seatConfigs.filter(
        (s) => s.seatType === 'vip' && s.isActive,
    ).length;
    this.premiumSeats = seatConfigs.filter(
        (s) => s.seatType === 'premium' && s.isActive,
    ).length;
});

// Methods
TheaterSchema.methods.generateRowLabels = function (
    count: number,
    prefix = '',
) {
    const labels = [];
    for (let i = 0; i < count; i++) {
        if (i < 26) {
            labels.push(prefix + String.fromCharCode(65 + i));
        } else {
            labels.push(prefix + 'R' + (i + 1));
        }
    }
    return labels;
};

// Virtuals
TheaterSchema.virtual('formattedCapacity').get(function () {
    const parts = [`${this.totalSeats} total`];
    if (this.vipSeats > 0) parts.push(`${this.vipSeats} VIP`);
    if (this.premiumSeats > 0) parts.push(`${this.premiumSeats} Premium`);
    return parts.join(', ');
});
