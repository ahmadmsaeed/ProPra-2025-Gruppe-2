import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Define a reusable select object to avoid duplication
  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    role: true,
    isBlocked: true,
  };

  async listTeachers() {
    // Get both teachers and tutors
    return this.prisma.user.findMany({
      where: { 
        OR: [
          { role: Role.TEACHER },
          { role: Role.TUTOR }
        ]
      },
      select: this.userSelect,
    });
  }

  async listStudents() {
    return this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: this.userSelect,
    });
  }

  async createUser(createUserDto: CreateUserDto) {    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-Mail wird bereits verwendet');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create the user
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: this.userSelect,
    });
  }
  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Benutzer mit ID ${userId} nicht gefunden`);
    }

    // If email is being updated, check if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });      if (existingUser) {
        throw new ConflictException('E-Mail wird bereits verwendet');
      }
    }

    // If password is provided, hash it
    const data = { ...updateUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Update the user
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect,
    });
  }
  async deleteUser(userId: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Benutzer mit ID ${userId} nicht gefunden`);
    }// Prevent deletion of teacher accounts for safety
    if (user.role === Role.TEACHER) {
      throw new BadRequestException('Dozenten-Konten können nicht gelöscht werden');
    }

    // Delete the user
    return this.prisma.user.delete({
      where: { id: userId },
      select: this.userSelect,
    });
  }
  async blockUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Benutzer mit ID ${userId} nicht gefunden`);
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
      select: this.userSelect,
    });
  }
  async unblockUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Benutzer mit ID ${userId} nicht gefunden`);
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
      select: this.userSelect,
    });
  }
}
