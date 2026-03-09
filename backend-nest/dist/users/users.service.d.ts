import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
    create(user: Partial<User>): Promise<UserDocument>;
    findOneByEmail(email: string): Promise<UserDocument | null>;
    findById(id: string): Promise<UserDocument>;
    findAll(): Promise<UserDocument[]>;
    updateRole(id: string, role: string): Promise<UserDocument>;
    delete(id: string): Promise<void>;
    updateProfile(id: string, updateDto: any): Promise<UserDocument>;
    updateLanguage(id: string, language: 'en' | 'ar'): Promise<UserDocument>;
    createUserByAdmin(createDto: any): Promise<UserDocument>;
    blockUser(id: string, isBlocked: boolean): Promise<UserDocument>;
}
