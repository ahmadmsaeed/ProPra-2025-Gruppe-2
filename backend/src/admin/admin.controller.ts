import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { ExerciseService } from '../exercise/exercise.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser {
  user: {
    sub: number;
    email: string;
    role: string;
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.TUTOR)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exerciseService: ExerciseService,
  ) {}

  @Get('teachers')
  async listTeachers() {
    return this.adminService.listTeachers();
  }

  @Get('tutors')
  async listTutors() {
    return this.adminService.listTutors();
  }

  @Get('students')
  async listStudents() {
    return this.adminService.listStudents();
  }

  @Get('exercises')
  async listExercises() {
    return this.exerciseService.findAll();
  }

  @Get('students/:id/progress')
  async getStudentProgress(@Param('id', ParseIntPipe) studentId: number) {
    return this.adminService.getStudentProgress(studentId);
  }

  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    // Prevent teachers from changing their own role
    if (
      req.user.sub === userId &&
      updateUserDto.role &&
      updateUserDto.role !== Role.TEACHER
    ) {
      throw new ForbiddenException(
        'Sie können Ihre eigene Rolle nicht ändern.',
      );
    }
    return this.adminService.updateUser(userId, updateUserDto);
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: RequestWithUser,
  ) {
    // Prevent teachers from deleting themselves
    if (req.user.sub === userId) {
      throw new ForbiddenException(
        'Sie können Ihr eigenes Konto nicht löschen.',
      );
    }
    return this.adminService.deleteUser(userId);
  }

  @Patch('users/:id/block')
  async blockUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: RequestWithUser,
  ) {
    if (req.user.sub === userId) {
      throw new ForbiddenException(
        'Sie können Ihr eigenes Konto nicht sperren.',
      );
    }
    return this.adminService.blockUser(userId);
  }

  @Patch('users/:id/unblock')
  async unblockUser(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.unblockUser(userId);
  }
}
