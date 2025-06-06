import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, ParseIntPipe, ForbiddenException, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard'; // Assuming RolesGuard exists
import { Roles } from '../auth/roles.decorator'; // Assuming Roles decorator exists
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Protect all routes
@Roles('TEACHER') // Allow only TEACHER role (not TUTOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('teachers')
  async listTeachers() {
    return this.adminService.listTeachers();
  }

  @Get('students')
  async listStudents() {
    return this.adminService.listStudents();
  }

  @Post('users')
  async createUser(@Body() createUserDto: any) {
    return this.adminService.createUser(createUserDto);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: any,
    @Req() req,
  ) {    // Prevent teachers from changing their own role
    if (req.user.sub === userId && updateUserDto.role && updateUserDto.role !== Role.TEACHER) {
      throw new ForbiddenException('Sie können Ihre eigene Rolle nicht ändern.');
    }
    return this.adminService.updateUser(userId, updateUserDto);
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req,
  ) {    // Prevent teachers from deleting themselves
    if (req.user.sub === userId) {
      throw new ForbiddenException('Sie können Ihr eigenes Konto nicht löschen.');
    }
    return this.adminService.deleteUser(userId);
  }

  @Patch('users/:id/block')
  async blockUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req,
  ) {    if (req.user.sub === userId) {
      throw new ForbiddenException('Sie können sich nicht selbst sperren.');
    }
    return this.adminService.blockUser(userId);
  }

  @Patch('users/:id/unblock')
  async unblockUser(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.unblockUser(userId);
  }
}
