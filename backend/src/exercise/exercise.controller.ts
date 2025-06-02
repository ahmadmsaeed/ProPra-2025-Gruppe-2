/**
 * Controller for exercise management endpoints (CRUD, file upload, etc.).
 * All routes are protected by JWT and role guards.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExerciseService } from './exercise.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types';

interface ExerciseCreateData {
  title: string;
  description: string;
  initialQuery?: string;
  solutionQuery: string;
  databaseSchemaId?: number;
  authorId: number;
  sqlFile?: Express.Multer.File;
}

@Controller('exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  /**
   * Get all exercises (for management views).
   */
  @Get()
  async getAllExercises() {
    return this.exerciseService.findAll();
  }

  /**
   * Get a single exercise by ID.
   */
  @Get(':id')
  async getExercise(@Param('id') id: string) {
    return this.exerciseService.findOne(+id);
  }

  /**
   * Create a new exercise (teachers/tutors only, supports file upload).
   */
  @Post()
  @Roles(Role.TEACHER, Role.TUTOR)
  @UseInterceptors(FileInterceptor('sqlFile'))
  async createExercise(
    @Request() req: AuthenticatedRequest,
    @Body() body: { exercise: string | Record<string, unknown> },
    @UploadedFile() sqlFile: Express.Multer.File,
  ) {
    const exerciseData: Record<string, unknown> =
      typeof body.exercise === 'string'
        ? (JSON.parse(body.exercise) as Record<string, unknown>)
        : body.exercise;
    const userId = req.user.sub;
    return this.exerciseService.create({
      ...exerciseData,
      authorId: userId,
      sqlFile,
    } as ExerciseCreateData);
  }

  /**
   * Update an existing exercise (teachers/tutors only, supports file upload).
   */
  @Patch(':id')
  @Roles(Role.TEACHER, Role.TUTOR)
  @UseInterceptors(FileInterceptor('sqlFile'))
  async updateExercise(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { exercise: string | object },
    @UploadedFile() sqlFile: Express.Multer.File,
  ) {
    const exerciseData =
      typeof body.exercise === 'string'
        ? (JSON.parse(body.exercise) as Record<string, unknown>)
        : body.exercise;
    const userId = req.user.sub;
    return this.exerciseService.update(+id, {
      ...exerciseData,
      authorId: userId,
      userRole: req.user.role,
      sqlFile,
    });
  }

  /**
   * Delete an exercise (teachers can delete any, tutors only their own).
   */
  @Delete(':id')
  @Roles(Role.TEACHER, Role.TUTOR)
  async deleteExercise(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.exerciseService.delete(+id, req.user.sub, req.user.role);
  }
}
