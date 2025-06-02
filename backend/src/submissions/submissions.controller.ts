/**
 * Controller for handling exercise submissions
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../types/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * Get all submissions for the current student
   */
  @Get('my')
  @Roles(Role.STUDENT, Role.TUTOR, Role.TEACHER)
  async getMySubmissions(@Request() req: AuthenticatedRequest) {
    const studentId = req.user.sub;
    return this.submissionsService.getStudentSubmissions(studentId);
  }

  /**
   * Get all submissions for a specific exercise (teachers/tutors only)
   */
  @Get('exercise/:id')
  @Roles(Role.TEACHER, Role.TUTOR)
  async getExerciseSubmissions(@Param('id', ParseIntPipe) exerciseId: number) {
    return this.submissionsService.getExerciseSubmissions(exerciseId);
  }

  /**
   * Submit a solution to an exercise
   */
  @Post('submit')
  @Roles(Role.STUDENT, Role.TUTOR, Role.TEACHER)
  async submitSolution(
    @Request() req: AuthenticatedRequest,
    @Body() body: { exerciseId: number; query: string },
  ) {
    const studentId = req.user.sub;
    return this.submissionsService.submitSolution(
      studentId,
      body.exerciseId,
      body.query,
    );
  }

  /**
   * Get a specific submission by ID
   */
  @Get(':id')
  @Roles(Role.STUDENT, Role.TUTOR, Role.TEACHER)
  async getSubmission(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.getSubmission(id);
  }
}
