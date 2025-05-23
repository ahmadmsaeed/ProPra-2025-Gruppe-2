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

@Controller('exercise-sessions')
// @UseGuards(JwtAuthGuard, RolesGuard) - Auth guards commented out until implemented
export class ExerciseSessionController {
  constructor(
    private readonly exerciseSessionService: ExerciseSessionService,
  ) {}

  /**
   * Start a new exercise session for the current student
   */
  @Post('start')
  async startSession(@Body() body: { exerciseId: number }, @Request() req) {
    // For demo purposes, using a fixed studentId
    // In production, this would come from req.user.id after authentication
    const studentId = 1; // req.user.id;

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
    // For demo purposes, using a fixed studentId
    const studentId = 1; // req.user.id;
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
    // For demo purposes, using a fixed studentId
    const studentId = 1; // req.user.id;
    const container =
      this.exerciseSessionService['dockerService'].getContainer(sessionId);

    // Verify this session belongs to the current student
    if (!container || container.studentId !== studentId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    return this.exerciseSessionService.endExerciseSession(sessionId);
  }
}
