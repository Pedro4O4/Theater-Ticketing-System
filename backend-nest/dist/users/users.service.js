"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
const bcrypt = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(user) {
        const newUser = new this.userModel(user);
        return newUser.save();
    }
    async findOneByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async findAll() {
        return this.userModel.find().select('-password').exec();
    }
    async updateRole(id, role) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { role }, { new: true, runValidators: true })
            .select('-password')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async delete(id) {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('User not found');
        }
    }
    async updateProfile(id, updateDto) {
        const { name, email, phone, profilePicture, instapayNumber } = updateDto;
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (email && email !== user.email) {
            const existingUser = await this.userModel.findOne({ email }).exec();
            if (existingUser) {
                throw new common_1.BadRequestException('Email already in use');
            }
        }
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (phone !== undefined)
            user.phone = phone;
        if (profilePicture !== undefined)
            user.profilePicture = profilePicture;
        if (instapayNumber !== undefined)
            user.instapayNumber = instapayNumber;
        return await user.save();
    }
    async createUserByAdmin(createDto) {
        const { email, password, name, role } = createDto;
        if (role !== user_schema_1.UserRole.ADMIN && role !== user_schema_1.UserRole.ORGANIZER) {
            throw new common_1.BadRequestException('Admin can only create Admin or Organizer accounts');
        }
        const existingUser = await this.findOneByEmail(email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new this.userModel({
            name,
            email,
            password: hashedPassword,
            role: role,
            isVerified: false,
            requiresPasswordChange: true,
        });
        return newUser.save();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map