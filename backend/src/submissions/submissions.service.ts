/**
 * Service for handling student exercise submissions
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SqlImportService } from '../sql-import/sql-import.service';
import { ExerciseSessionService } from '../common/services/exercise-session.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private sqlImportService: SqlImportService,
    private exerciseSessionService: ExerciseSessionService,
  ) {}

  /**
   * Get all submissions for a student
   */
  async getStudentSubmissions(studentId: number) {
    return this.prisma.submission.findMany({
      where: { studentId },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all submissions for an exercise
   */
  async getExerciseSubmissions(exerciseId: number) {
    return this.prisma.submission.findMany({
      where: { exerciseId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit a solution to an exercise
   */
  async submitSolution(studentId: number, exerciseId: number, query: string) {
    // Get the exercise to validate against
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        database: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    try {
      // Start or get an existing exercise session
      const { sessionId } = await this.exerciseSessionService.startExerciseSession(
        studentId,
        exerciseId,
      );

      // Execute both queries in the student's container
      // Execute student query
      const studentResult = await this.exerciseSessionService.executeQuery(
        sessionId,
        query,
      );

      // Execute solution query
      const solutionResult = await this.exerciseSessionService.executeQuery(
        sessionId,
        exercise.solutionQuery,
      );

      // Compare results - first convert to strings to normalize formatting
      const studentResultStr = JSON.stringify(
        this.normalizeResult(studentResult),
      );
      const solutionResultStr = JSON.stringify(
        this.normalizeResult(solutionResult),
      );

      // Check if results match
      const isCorrect = studentResultStr === solutionResultStr;

      // Create feedback based on correctness
      const feedback = isCorrect
        ? 'Korrekt! Deine Lösung stimmt mit der Musterlösung überein.'
        : 'Nicht korrekt. Deine Antwort liefert ein anderes Ergebnis als die Musterlösung.';

      // Save the submission
      return this.prisma.submission.create({
        data: {
          query,
          isCorrect,
          feedback,
          studentId,
          exerciseId,
        },
      });
    } catch (error) {
      // If there was an error executing the query, create a submission with error feedback
      return this.prisma.submission.create({
        data: {
          query,
          isCorrect: false,
          feedback: `Fehler bei der Ausführung: ${error.message || 'Unbekannter Fehler'}`,
          studentId,
          exerciseId,
        },
      });
    }
  }

  /**
   * Get a submission by ID
   */
  async getSubmission(id: number) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            description: true,
            solutionQuery: true,
            database: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  /**
   * Normalize query results for comparison
   * This handles differences in column ordering, capitalization, etc.
   */
  private normalizeResult(result: any): any {
    if (!result) return null;

    // If not an array or empty array, return as is
    if (!Array.isArray(result) || result.length === 0) {
      return result;
    }

    // For result sets, normalize each row
    return result.map((row) => {
      const normalizedRow: Record<string, any> = {};

      // Sort keys alphabetically and lowercase them
      Object.keys(row)
        .sort()
        .forEach((key) => {
          // Convert all values to strings for consistent comparison
          normalizedRow[key.toLowerCase()] = String(row[key]);
        });

      return normalizedRow;
    });
  }
}
