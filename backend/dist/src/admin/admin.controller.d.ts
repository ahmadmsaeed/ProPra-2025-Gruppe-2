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
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    listTutors(): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    listStudents(): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">[]>;
    listExercises(): Promise<({
        author: {
            id: number;
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
        database: {
            id: number;
            name: string;
            schema: string;
            seedData: string;
        };
    } & {
        id: number;
        createdAt: Date;
        title: string;
        description: string;
        initialQuery: string | null;
        solutionQuery: string;
        databaseSchemaId: number;
        authorId: number;
        updatedAt: Date;
    })[]>;
    getStudentProgress(studentId: number): Promise<{
        completedExercises: number;
        progressPercentage: number;
        lastActivity: Date | null;
    }>;
    createUser(createUserDto: CreateUserDto): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    updateUser(userId: number, updateUserDto: UpdateUserDto, req: RequestWithUser): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    deleteUser(userId: number, req: RequestWithUser): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    blockUser(userId: number, req: RequestWithUser): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
    unblockUser(userId: number): Promise<Omit<{
        id: number;
        createdAt: Date;
        name: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isBlocked: boolean;
    }, "password">>;
}
export {};
