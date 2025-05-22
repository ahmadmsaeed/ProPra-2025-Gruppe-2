import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isBlocked: true,
    createdAt: true,
  };

  async listTeachers(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      where: { role: Role.TEACHER },
      select: this.userSelect,
    });
  }

  async listTutors(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      where: { role: Role.TUTOR },
      select: this.userSelect,
    });
  }

  async listStudents(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: this.userSelect,
    });
  }

  async createUser(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
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

  async updateUser(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    const data: UpdateUserDto = { ...dto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect,
    });
  }

  async deleteUser(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role === Role.TEACHER) {
      throw new ForbiddenException('Teacher accounts cannot be deleted');
    }

    return this.prisma.user.delete({
      where: { id: userId },
      select: this.userSelect,
    });
  }

  async blockUser(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role === Role.TEACHER) {
      throw new ForbiddenException('Teacher accounts cannot be blocked');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
      select: this.userSelect,
    });
  }

  async unblockUser(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
      select: this.userSelect,
    });
  }
}
