import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    listTeachers(): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }[]>;
    listStudents(): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }[]>;
    createUser(createUserDto: any): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    updateUser(userId: number, updateUserDto: any, req: any): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    deleteUser(userId: number, req: any): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    blockUser(userId: number, req: any): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    unblockUser(userId: number): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
}
