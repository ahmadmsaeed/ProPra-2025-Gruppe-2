import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../types/auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        id: number;
        email: string;
        name: string;
    }>;
    login(dto: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    me(req: AuthenticatedRequest): Promise<{
        id: number;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    updateProfile(req: AuthenticatedRequest, dto: {
        name: string;
        email: string;
    }): Promise<{
        id: number;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    changePassword(req: AuthenticatedRequest, dto: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
}
