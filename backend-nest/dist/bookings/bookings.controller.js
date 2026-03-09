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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const bookings_service_1 = require("./bookings.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let BookingsController = class BookingsController {
    bookingsService;
    constructor(bookingsService) {
        this.bookingsService = bookingsService;
    }
    async holdSeats(body, req) {
        const data = await this.bookingsService.holdSeats(body.eventId, body.seats, req.user._id);
        return { success: true, data };
    }
    async releaseHold(id, req) {
        await this.bookingsService.releaseHold(id, req.user._id);
        return { success: true, message: 'Hold released' };
    }
    async create(createDto, req) {
        const data = await this.bookingsService.create(createDto, req.user._id);
        return { success: true, data };
    }
    async findAllForUser(req) {
        const data = await this.bookingsService.findAllForUser(req.user._id);
        return { success: true, count: data.length, data };
    }
    async findOne(id) {
        const data = await this.bookingsService.findOne(id);
        return { success: true, data };
    }
    async remove(id, req) {
        await this.bookingsService.delete(id, req.user._id);
        return { success: true, message: 'Booking deleted successfully' };
    }
    async getAvailableSeats(eventId) {
        const data = await this.bookingsService.getAvailableSeats(eventId);
        return { success: true, data };
    }
    async getEventSeats(eventId) {
        const data = await this.bookingsService.getAvailableSeats(eventId);
        return { success: true, data };
    }
    async uploadReceipt(id, receiptBase64, req) {
        if (!receiptBase64) {
            return { success: false, message: 'Receipt image is required' };
        }
        const data = await this.bookingsService.uploadReceipt(id, req.user._id, receiptBase64);
        return { success: true, data };
    }
    async getEventBookings(eventId) {
        const data = await this.bookingsService.findAllForEvent(eventId);
        return { success: true, count: data.length, data };
    }
    async updateBookingStatus(id, status, req) {
        const data = await this.bookingsService.updateBookingStatus(id, status, req.user);
        return { success: true, data };
    }
    async cancelSelectedSeats(id, body, req) {
        const result = await this.bookingsService.cancelSelectedSeats(id, req.user._id, body.seatKeys || [], body.cancelAll || false);
        return { success: true, ...result };
    }
    async requestCancellation(id, body, req) {
        const data = await this.bookingsService.requestCancellation(id, req.user._id, body.seatKeys || [], body.cancelAll || false, body.reason || '');
        return { success: true, data };
    }
    async getCancellationRequests(eventId) {
        const data = await this.bookingsService.getCancellationRequests(eventId);
        return { success: true, count: data.length, data };
    }
    async approveCancellation(id, req) {
        const data = await this.bookingsService.approveCancellation(id, req.user);
        return { success: true, data };
    }
    async rejectCancellation(id, req) {
        const data = await this.bookingsService.rejectCancellation(id, req.user);
        return { success: true, data };
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Post)('hold-seats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "holdSeats", null);
__decorate([
    (0, common_1.Delete)('hold-seats/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "releaseHold", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my-bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "findAllForUser", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('availability/:eventId'),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getAvailableSeats", null);
__decorate([
    (0, common_1.Get)('event/:eventId/seats'),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getEventSeats", null);
__decorate([
    (0, common_1.Post)(':id/receipt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('receiptBase64')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "uploadReceipt", null);
__decorate([
    (0, common_1.Get)('event/:eventId/bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getEventBookings", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "updateBookingStatus", null);
__decorate([
    (0, common_1.Post)(':id/cancel-seats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "cancelSelectedSeats", null);
__decorate([
    (0, common_1.Post)(':id/request-cancellation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "requestCancellation", null);
__decorate([
    (0, common_1.Get)('event/:eventId/cancellation-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getCancellationRequests", null);
__decorate([
    (0, common_1.Patch)(':id/approve-cancellation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "approveCancellation", null);
__decorate([
    (0, common_1.Patch)(':id/reject-cancellation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "rejectCancellation", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_1.Controller)('api/v1/booking'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map