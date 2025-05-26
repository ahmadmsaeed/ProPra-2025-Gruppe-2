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
    // Suche Container für diesen User und diese Übung
    let container = this.dockerService.getContainerForStudent(studentId, exerciseId);

    if (container) {
      this.logger.log(`[startExerciseSession] Gefundener Container: ${container.id}, Status: ${container.status}`);
      if (container.status === 'stopped') {
        this.logger.log(`[startExerciseSession] Starte gestoppten Container: ${container.id}`);
        // Container ist gestoppt, starte ihn neu!
        const started = await this.dockerService.startContainer(container.id);
        if (started) {
          container.status = 'running';
          this.dockerService.updateContainer(container); // <-- jetzt korrekt!
          return {
            sessionId: container.id,
            message: 'Restarted existing session',
          };
        } else {
          throw new Error('Could not restart existing container');
        }
      }
      if (container.status === 'running') {
        return {
          sessionId: container.id,
          message: 'Continuing existing session',
        };
      }
    }

    // Kein Container vorhanden: neuen anlegen
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId }, include: { database: true } });
    if (!exercise || !exercise.database) {
      throw new NotFoundException('Exercise or associated database not found');
    }
    container = await this.dockerService.createContainer(
      studentId,
      exerciseId,
      exercise.database.id,
    );
    return {
      sessionId: container.id,
      message: 'Started new session',
    };
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
      await this.dockerService.stopAndRemoveContainer(sessionId);

      return {
        success: true,
        message: 'Exercise session ended successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to end exercise session: ${error.message}`);
      throw error;
    }
  }
}
