import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
interface RequestWithUser {
    user: {
        sub: number;
        email: string;
        role: string;
    };
}
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    listTeachers(): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    listTutors(): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    listStudents(): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    createUser(createUserDto: CreateUserDto): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    updateUser(userId: number, updateUserDto: UpdateUserDto, req: RequestWithUser): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    deleteUser(userId: number, req: RequestWithUser): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    blockUser(userId: number, req: RequestWithUser): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    unblockUser(userId: number): Promise<Omit<{
        id: number;
        name: string;
        createdAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
}
export {};
