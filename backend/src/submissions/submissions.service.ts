/**
 * Service for handling student exercise submissions
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SqlImportService } from '../sql-import/sql-import.service';
import { DatabaseContainerService } from '../sql-import/database-container.service';

interface QueryResult {
  [key: string]: unknown;
}

interface NormalizedRow {
  [key: string]: string;
}

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private prisma: PrismaService,
    private sqlImportService: SqlImportService,
    private databaseContainerService: DatabaseContainerService,
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

    // Execute both queries and compare results
    try {
      // Execute student query on temporary container
      const studentResult = (await this.sqlImportService.executeQueryForStudent(
        exercise.databaseSchemaId,
        query,
        studentId,
      )) as QueryResult[];

      // Execute solution query on original database (for reference)
      const solutionResult = (await this.sqlImportService.executeQuery(
        exercise.databaseSchemaId,
        exercise.solutionQuery,
      )) as QueryResult[];

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
      const submission = await this.prisma.submission.create({
        data: {
          query,
          isCorrect,
          feedback,
          studentId,
          exerciseId,
        },
      });

      // If the solution is correct, cleanup the student's container
      if (isCorrect) {
        try {
          this.logger.log(
            `Solution is correct for student ${studentId} and exercise ${exerciseId}. Cleaning up container for database ${exercise.databaseSchemaId}.`,
          );

          // Cleanup the temporary container asynchronously
          // We don't await this to avoid blocking the submission response
          this.databaseContainerService
            .cleanupContainer(studentId, exercise.databaseSchemaId)
            .catch((error) => {
              this.logger.error(
                `Failed to cleanup container for student ${studentId} and database ${exercise.databaseSchemaId}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
              );
            });
        } catch (error) {
          // Log cleanup errors but don't fail the submission
          this.logger.error(
            `Error initiating container cleanup for student ${studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      return submission;
    } catch (error) {
      // If there was an error executing the query, create a submission with error feedback
      const errorMessage =
        error instanceof Error ? error.message : 'Unbekannter Fehler';
      return this.prisma.submission.create({
        data: {
          query,
          isCorrect: false,
          feedback: `Fehler bei der Ausführung: ${errorMessage}`,
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
  private normalizeResult(
    result: QueryResult[] | null,
  ): NormalizedRow[] | null {
    if (!result) return null;

    // If not an array or empty array, return empty array
    if (!Array.isArray(result) || result.length === 0) {
      return [];
    }

    // For result sets, normalize each row
    return result.map((row) => {
      const normalizedRow: NormalizedRow = {};

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
