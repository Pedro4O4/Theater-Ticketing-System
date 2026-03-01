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
exports.BookingSchema = exports.Booking = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SelectedSeat = class SelectedSeat {
    row;
    seatNumber;
    section;
    seatType;
    price;
    attendeeName;
    attendeePhone;
};
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SelectedSeat.prototype, "row", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SelectedSeat.prototype, "seatNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['main', 'balcony'], default: 'main' }),
    __metadata("design:type", String)
], SelectedSeat.prototype, "section", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['standard', 'vip', 'premium', 'wheelchair'],
        default: 'standard',
    }),
    __metadata("design:type", String)
], SelectedSeat.prototype, "seatType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, required: true }),
    __metadata("design:type", Number)
], SelectedSeat.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SelectedSeat.prototype, "attendeeName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SelectedSeat.prototype, "attendeePhone", void 0);
SelectedSeat = __decorate([
    (0, mongoose_1.Schema)()
], SelectedSeat);
let Booking = class Booking {
    StandardId;
    eventId;
    numberOfTickets;
    totalPrice;
    status;
    hasTheaterSeating;
    pendingExpiresAt;
    selectedSeats;
};
exports.Booking = Booking;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", Object)
], Booking.prototype, "StandardId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Event', required: true }),
    __metadata("design:type", Object)
], Booking.prototype, "eventId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1 }),
    __metadata("design:type", Number)
], Booking.prototype, "numberOfTickets", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Booking.prototype, "totalPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['pending', 'confirmed', 'canceled', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Booking.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Booking.prototype, "hasTheaterSeating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Date)
], Booking.prototype, "pendingExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [SelectedSeat] }),
    __metadata("design:type", Array)
], Booking.prototype, "selectedSeats", void 0);
exports.Booking = Booking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Booking);
exports.BookingSchema = mongoose_1.SchemaFactory.createForClass(Booking);
exports.BookingSchema.index({ pendingExpiresAt: 1 }, { expireAfterSeconds: 0 });
//# sourceMappingURL=booking.schema.js.map