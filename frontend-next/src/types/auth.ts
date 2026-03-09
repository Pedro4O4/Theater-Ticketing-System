export type UserRole = 'System Admin' | 'Organizer' | 'Standard User' | 'Scanner';

export interface User {
    _id: string;
    userId?: string; // Alias for _id
    id?: string; // Another alias
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    profilePicture?: string;
    instapayNumber?: string;
    instapayQR?: string;
    isVerified?: boolean;
    isBlocked?: boolean;
    language?: 'en' | 'ar';
    createdAt?: string;
    username?: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    data?: {
        token: string;
        user: User;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
