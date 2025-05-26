import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExerciseSessionService } from '../common/services/exercise-session.service';
import { DockerContainerService } from '../common/services/docker-container.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/types/models';
import { Roles } from 'src/auth/roles.decorator';
@Controller('exercise-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExerciseSessionController {
  constructor(
    private readonly exerciseSessionService: ExerciseSessionService,
    private readonly dockerContainerService: DockerContainerService, // <--- hinzugefügt!
  ) {}

  /**
   * Start a new exercise session for the current student
   */
  @Post('start')
  async startSession(@Body() body: { exerciseId: number }, @Request() req) {
    const studentId = req.user.sub || req.user.id;

    if (!body.exerciseId) {
      throw new BadRequestException('exerciseId is required');
    }

    return this.exerciseSessionService.startExerciseSession(
      studentId,
      body.exerciseId,
    );
  }

  /**
   * Execute a query in the student's exercise session
   */
  @Post('query/:sessionId')
  async executeQuery(
    @Param('sessionId') sessionId: string,
    @Body() body: { query: string },
    @Request() req,
  ) {
    
    const studentId = req.user.sub || req.user.id;
    const container =
      this.exerciseSessionService['dockerService'].getContainer(sessionId);

    // Verify this session belongs to the current student
    if (!container || container.studentId !== studentId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    if (!body.query) {
      throw new BadRequestException('query is required');
    }

    return this.exerciseSessionService.executeQuery(sessionId, body.query);
  }

  /**
   * End an exercise session
   */
  @Delete(':sessionId')
  async endSession(@Param('sessionId') sessionId: string, @Request() req) {

    const studentId = req.user.sub || req.user.id;
    const container =
      this.exerciseSessionService['dockerService'].getContainer(sessionId);

    // Verify this session belongs to the current student
    if (!container || container.studentId !== studentId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    return this.exerciseSessionService.endExerciseSession(sessionId);
  }

  /**
   * Stop all exercise sessions for the current user
   */
  @Post('stop-all')
  @Roles(Role.STUDENT, Role.TUTOR, Role.TEACHER)
  async stopAllSessionsForUser(@Request() req) {
    console.log('Stoppe alle Container für User:', req.user);
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    const userId = req.user.sub || req.user.id;
    await this.dockerContainerService.stopAllContainersForUser(userId);
    return { success: true };
  }
}
