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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_schema_1 = require("./schemas/user.schema");
const events_service_1 = require("../events/events.service");
const bookings_service_1 = require("../bookings/bookings.service");
let UsersController = class UsersController {
    usersService;
    eventsService;
    bookingsService;
    constructor(usersService, eventsService, bookingsService) {
        this.usersService = usersService;
        this.eventsService = eventsService;
        this.bookingsService = bookingsService;
    }
    async getProfile(req) {
        const data = await this.usersService.findById(req.user._id);
        return { success: true, data };
    }
    async updateProfile(req, updateDto) {
        const data = await this.usersService.updateProfile(req.user._id, updateDto);
        return { success: true, data };
    }
    async getMyEvents(req) {
        const data = await this.eventsService.findByOrganizer(req.user._id);
        return { success: true, data };
    }
    async getMyEventsAnalytics(req) {
        const data = await this.eventsService.getOrganizerAnalytics(req.user._id);
        return data;
    }
    async updateLanguage(req, language) {
        const data = await this.usersService.updateLanguage(req.user._id, language);
        return { success: true, data };
    }
    async getMyBookings(req) {
        const data = await this.bookingsService.findAllForUser(req.user._id);
        return { success: true, data };
    }
    async findAll() {
        const data = await this.usersService.findAll();
        return { success: true, count: data.length, data };
    }
    async createUser(createUserDto) {
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
    async findOne(id) {
        const data = await this.usersService.findById(id);
        return { success: true, data };
    }
    async updateRole(id, role) {
        const data = await this.usersService.updateRole(id, role);
        return { success: true, data };
    }
    async blockUser(id, isBlocked) {
        const data = await this.usersService.blockUser(id, isBlocked);
        return {
            success: true,
            message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
            data,
        };
    }
    async remove(id) {
        await this.usersService.delete(id);
        return { success: true, message: 'User deleted successfully' };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyEvents", null);
__decorate([
    (0, common_1.Get)('events/analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyEventsAnalytics", null);
__decorate([
    (0, common_1.Put)('language'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateLanguage", null);
__decorate([
    (0, common_1.Get)('bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyBookings", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/role'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Put)(':id/block'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isBlocked')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('api/v1/user'),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => events_service_1.EventsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => bookings_service_1.BookingsService))),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        events_service_1.EventsService,
        bookings_service_1.BookingsService])
], UsersController);
//# sourceMappingURL=users.controller.js.map