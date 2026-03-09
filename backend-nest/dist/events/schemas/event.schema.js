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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSchema = exports.Event = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SeatPricing = class SeatPricing {
    seatType;
    price;
};
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['standard', 'vip', 'premium', 'wheelchair'],
        required: true,
    }),
    __metadata("design:type", String)
], SeatPricing.prototype, "seatType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, default: 0 }),
    __metadata("design:type", Number)
], SeatPricing.prototype, "price", void 0);
SeatPricing = __decorate([
    (0, mongoose_1.Schema)()
], SeatPricing);
let BookedSeat = class BookedSeat {
    row;
    seatNumber;
    section;
    bookingId;
    holdId;
};
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], BookedSeat.prototype, "row", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], BookedSeat.prototype, "seatNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['main', 'balcony'], default: 'main' }),
    __metadata("design:type", String)
], BookedSeat.prototype, "section", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Booking' }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], BookedSeat.prototype, "bookingId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'SeatHold' }),
    __metadata("design:type", mongoose_2.Schema.Types.ObjectId)
], BookedSeat.prototype, "holdId", void 0);
BookedSeat = __decorate([
    (0, mongoose_1.Schema)()
], BookedSeat);
let EventSeatConfig = class EventSeatConfig {
    row;
    seatNumber;
    seatType;
    section;
};
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EventSeatConfig.prototype, "row", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], EventSeatConfig.prototype, "seatNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['standard', 'vip', 'premium', 'wheelchair', 'disabled'],
        default: 'standard',
    }),
    __metadata("design:type", String)
], EventSeatConfig.prototype, "seatType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'main' }),
    __metadata("design:type", String)
], EventSeatConfig.prototype, "section", void 0);
EventSeatConfig = __decorate([
    (0, mongoose_1.Schema)()
], EventSeatConfig);
let Event = class Event {
    organizerId;
    title;
    description;
    date;
    location;
    category;
    image;
    ticketPrice;
    totalTickets;
    remainingTickets;
    status;
    theater;
    hasTheaterSeating;
    seatPricing;
    bookedSeats;
    seatConfig;
    otp;
    otpExpires;
};
exports.Event = Event;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", Object)
], Event.prototype, "organizerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Event.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Event.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Event.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Event.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Event.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'default-image.jpg' }),
    __metadata("design:type", String)
], Event.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0 }),
    __metadata("design:type", Number)
], Event.prototype, "ticketPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0 }),
    __metadata("design:type", Number)
], Event.prototype, "totalTickets", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0 }),
    __metadata("design:type", Number)
], Event.prototype, "remainingTickets", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['approved', 'pending', 'declined'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Event.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Theater', default: null }),
    __metadata("design:type", Object)
], Event.prototype, "theater", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Event.prototype, "hasTheaterSeating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [SeatPricing] }),
    __metadata("design:type", Array)
], Event.prototype, "seatPricing", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [BookedSeat] }),
    __metadata("design:type", Array)
], Event.prototype, "bookedSeats", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [EventSeatConfig] }),
    __metadata("design:type", Array)
], Event.prototype, "seatConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", String)
], Event.prototype, "otp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Date)
], Event.prototype, "otpExpires", void 0);
exports.Event = Event = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Event);
exports.EventSchema = mongoose_1.SchemaFactory.createForClass(Event);
//# sourceMappingURL=event.schema.js.map