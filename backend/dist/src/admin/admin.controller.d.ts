import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { ExerciseService } from '../exercise/exercise.service';
interface RequestWithUser {
    user: {
        sub: number;
        email: string;
        role: string;
    };
}
export declare class AdminController {
    private readonly adminService;
    private readonly exerciseService;
    constructor(adminService: AdminService, exerciseService: ExerciseService);
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
    listExercises(): Promise<({
        database: {
            id: number;
            name: string;
            schema: string;
            seedData: string;
        };
        author: {
            id: number;
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
    } & {
        id: number;
        authorId: number;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        initialQuery: string | null;
        solutionQuery: string;
        databaseSchemaId: number;
    })[]>;
    getStudentProgress(studentId: number): Promise<{
        completedExercises: number;
        progressPercentage: number;
        lastActivity: Date | null;
    }>;
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
