"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    userSelect = {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
    };
    async listTeachers() {
        return this.prisma.user.findMany({
            where: { role: client_1.Role.TEACHER },
            select: this.userSelect,
        });
    }
    async listTutors() {
        return this.prisma.user.findMany({
            where: { role: client_1.Role.TUTOR },
            select: this.userSelect,
        });
    }
    async listStudents() {
        return this.prisma.user.findMany({
            where: { role: client_1.Role.STUDENT },
            select: this.userSelect,
        });
    }
    async createUser(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email is already in use');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 12);
        return this.prisma.user.create({
            data: {
                ...dto,
                password: hashedPassword,
            },
            select: this.userSelect,
        });
    }
    async updateUser(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (dto.email && dto.email !== user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('Email is already in use');
            }
        }
        const data = { ...dto };
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 12);
        }
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: this.userSelect,
        });
    }
    async deleteUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (user.role === client_1.Role.TEACHER) {
            throw new common_1.ForbiddenException('Teacher accounts cannot be deleted');
        }
        return this.prisma.user.delete({
            where: { id: userId },
            select: this.userSelect,
        });
    }
    async blockUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (user.role === client_1.Role.TEACHER) {
            throw new common_1.ForbiddenException('Teacher accounts cannot be blocked');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { isBlocked: true },
            select: this.userSelect,
        });
    }
    async unblockUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { isBlocked: false },
            select: this.userSelect,
        });
    }
    async getStudentProgress(studentId) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId, role: client_1.Role.STUDENT },
        });
        if (!student) {
            throw new common_1.NotFoundException(`Student with ID ${studentId} not found`);
        }
        const totalExercises = await this.prisma.exercise.count();
        const submissions = await this.prisma.submission.findMany({
            where: { studentId: studentId },
            include: { exercise: true },
        });
        const completedExerciseIds = new Set(submissions.map((s) => s.exerciseId));
        const completedExercises = completedExerciseIds.size;
        const progressPercentage = totalExercises > 0
            ? Math.round((completedExercises / totalExercises) * 100)
            : 0;
        const lastSubmission = await this.prisma.submission.findFirst({
            where: { studentId: studentId },
            orderBy: { createdAt: 'desc' },
        });
        return {
            completedExercises,
            progressPercentage,
            lastActivity: lastSubmission?.createdAt || null,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map