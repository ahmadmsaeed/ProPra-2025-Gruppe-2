import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
interface CreateUserDto {
    email: string;
    password: string;
    name: string;
    role: Role;
}
interface UpdateUserDto {
    email?: string;
    password?: string;
    name?: string;
    role?: Role;
}
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly userSelect;
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
    createUser(createUserDto: CreateUserDto): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    updateUser(userId: number, updateUserDto: UpdateUserDto): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    deleteUser(userId: number): Promise<{
        id: number;
        email: string;
        name: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    blockUser(userId: number): Promise<{
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
export {};
