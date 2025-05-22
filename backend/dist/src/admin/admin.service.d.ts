import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
export interface CreateUserDto {
    email: string;
    password: string;
    name: string;
    role: Role;
}
export interface UpdateUserDto {
    email?: string;
    password?: string;
    name?: string;
    role?: Role;
}
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly userSelect;
    listTeachers(): Promise<Omit<User, 'password'>[]>;
    listTutors(): Promise<Omit<User, 'password'>[]>;
    listStudents(): Promise<Omit<User, 'password'>[]>;
    createUser(dto: CreateUserDto): Promise<Omit<User, 'password'>>;
    updateUser(userId: number, dto: UpdateUserDto): Promise<Omit<User, 'password'>>;
    deleteUser(userId: number): Promise<Omit<User, 'password'>>;
    blockUser(userId: number): Promise<Omit<User, 'password'>>;
    unblockUser(userId: number): Promise<Omit<User, 'password'>>;
}
