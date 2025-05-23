import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DockerContainerService } from './docker-container.service';
import { ContainerDatabaseClientService } from './container-database-client.service';

@Injectable()
export class ExerciseSessionService {
  private readonly logger = new Logger(ExerciseSessionService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DockerContainerService))
    private readonly dockerService: DockerContainerService,
    @Inject(forwardRef(() => ContainerDatabaseClientService))
    private readonly dbClientService: ContainerDatabaseClientService,
  ) {}

  /**
   * Start a new exercise session for a student
   * This creates a Docker container with the appropriate database
   */
  async startExerciseSession(
    studentId: number,
    exerciseId: number,
  ): Promise<{
    sessionId: string;
    message: string;
  }> {
    try {
      // Check if student already has an active container for this exercise
      const existingContainer = this.dockerService.getActiveContainerForStudent(
        studentId,
        exerciseId,
      );

      if (existingContainer) {
        return {
          sessionId: existingContainer.id,
          message: 'Continuing existing session',
        };
      }

      // Get the exercise details
      const exercise = await this.prisma.exercise.findUnique({
        where: { id: exerciseId },
        include: {
          database: true,
        },
      });

      if (!exercise) {
        throw new NotFoundException(`Exercise with ID ${exerciseId} not found`);
      }

      // Create a new Docker container for this student and exercise
      const container = await this.dockerService.createContainer(
        studentId,
        exerciseId,
        exercise.database.id,
      );

      return {
        sessionId: container.id,
        message: 'New exercise session created',
      };
    } catch (error) {
      this.logger.error(`Failed to start exercise session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a query within a student's exercise session
   */
  async executeQuery(sessionId: string, query: string): Promise<any> {
    try {
      // Get the container for this session
      const container = this.dockerService.getContainer(sessionId);

      if (!container || container.status !== 'running') {
        throw new Error('Exercise session not found or not running');
      }

      // Execute the query on the container
      return await this.dbClientService.executeQuery(sessionId, query);
    } catch (error) {
      this.logger.error(`Failed to execute query in session: ${error.message}`);
      throw error;
    }
  }

  /**
   * End an exercise session and clean up resources
   */
  async endExerciseSession(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.dockerService.stopContainer(sessionId);

      if (result) {
        return {
          success: true,
          message: 'Exercise session ended successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to end exercise session',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to end exercise session: ${error.message}`);
      throw error;
    }
  }
}
