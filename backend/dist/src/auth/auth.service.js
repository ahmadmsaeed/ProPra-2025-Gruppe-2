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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.HttpException('E-Mail bereits vergeben', common_1.HttpStatus.BAD_REQUEST);
        }
        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, password: hash, name: dto.name },
        });
        return { id: user.id, email: user.email, name: user.name };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Ungültige Anmeldedaten');
        }
        if (user.isBlocked) {
            throw new common_1.ForbiddenException('Ihr Konto ist gesperrt. Bitte kontaktieren Sie den Support.');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Ungültige Anmeldedaten');
        }
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwt.sign(payload),
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
    }
    async me(user) {
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.sub },
            select: { id: true, email: true, name: true, role: true, isBlocked: true }
        });
        if (!dbUser)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        return dbUser;
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        if (dto.email !== user.email) {
            const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (existing)
                throw new common_1.HttpException('E-Mail bereits vergeben', common_1.HttpStatus.BAD_REQUEST);
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { name: dto.name, email: dto.email },
        });
        return { id: updated.id, email: updated.email, name: updated.name, role: updated.role };
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Benutzer nicht gefunden');
        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isPasswordValid)
            throw new common_1.UnauthorizedException('Das aktuelle Passwort ist falsch.');
        const hash = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map