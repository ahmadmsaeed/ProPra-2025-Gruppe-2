import { AuthService } from './auth.service';
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
    me(req: any): Promise<{
        id: number;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    updateProfile(req: any, dto: {
        name: string;
        email: string;
    }): Promise<{
        id: number;
        email: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    changePassword(req: any, dto: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
    }>;
}
