/**
 * Service for exercise management (CRUD, file upload, permission checks, etc.).
 * Handles creation, update, and deletion of exercises, including database schema upload.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SqlImportService } from '../sql-import/sql-import.service';
import * as fs from 'fs';
import * as path from 'path';
import { IExerciseService } from './interfaces/exercise.service.interface';

interface ExerciseCreateData {
  title: string;
  description: string;
  initialQuery?: string;
  solutionQuery: string;
  databaseSchemaId?: number;
  authorId: number;
  sqlFile?: Express.Multer.File;
}

interface ExerciseUpdateData {
  title?: string;
  description?: string;
  initialQuery?: string;
  solutionQuery?: string;
  databaseSchemaId?: number;
  authorId?: number;
  userRole?: string;
  sqlFile?: Express.Multer.File;
}

@Injectable()
export class ExerciseService implements IExerciseService {
  constructor(
    private prisma: PrismaService,
    private sqlImportService: SqlImportService,
  ) {}

  /**
   * Returns all exercises, including author and database info.
   */
  async findAll() {
    return this.prisma.exercise.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        database: {
          select: {
            id: true,
            name: true,
            schema: true,
            seedData: true,
          },
        },
      },
    });
  }

  /**
   * Returns a single exercise by ID, including author info.
   * Throws NotFoundException if not found.
   */
  async findOne(id: number) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }

    return exercise;
  }

  /**
   * Creates a new exercise. If a SQL file is provided, creates a new database as well.
   * Validates authorId and databaseSchemaId as needed.
   */
  async create(data: ExerciseCreateData) {
    const { sqlFile, databaseSchemaId, authorId, ...exerciseData } = data;

    // Validate authorId
    if (!authorId || typeof authorId !== 'number' || isNaN(authorId)) {
      throw new BadRequestException(
        'authorId is required and must be a valid number.',
      );
    }

    // If SQL file is provided, create a new database first
    if (sqlFile) {
      try {
        // Use the SqlImportService to create a database from the SQL file
        const sqlContent = sqlFile.buffer.toString('utf-8');
        const baseName = sqlFile.originalname.replace(/\.sql$/i, '');

        const newDatabase =
          await this.sqlImportService.createDatabaseFromContent(
            sqlContent,
            baseName,
            authorId,
          );

        // Create the exercise with the new database
        return this.prisma.exercise.create({
          data: {
            ...exerciseData,
            authorId,
            databaseSchemaId: newDatabase.id,
            solutionQuery: exerciseData.solutionQuery,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            database: {
              select: {
                id: true,
                name: true,
                schema: true,
                seedData: true,
              },
            },
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        throw new BadRequestException(
          `Failed to create database from SQL file: ${errorMessage}`,
        );
      }
    }

    // If no SQL file, require databaseSchemaId
    if (
      !databaseSchemaId ||
      typeof databaseSchemaId !== 'number' ||
      isNaN(databaseSchemaId)
    ) {
      throw new BadRequestException(
        'databaseSchemaId is required when no SQL file is provided.',
      );
    }

    // Create exercise with existing database
    return this.prisma.exercise.create({
      data: {
        ...exerciseData,
        authorId,
        databaseSchemaId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        database: {
          select: {
            id: true,
            name: true,
            schema: true,
            seedData: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing exercise. Only the author (or teacher) can update.
   * If a new SQL file is provided, updates the solutionQuery.
   */
  async update(id: number, data: ExerciseUpdateData) {
    const exercise = await this.findOne(id);

    // Check if user has permission to update
    // Teachers can update any exercise, tutors can only update their own
    if (data.authorId !== exercise.authorId && data.userRole !== 'TEACHER') {
      throw new ForbiddenException('You can only update your own exercises');
    }

    const { sqlFile, ...exerciseData } = data;

    // If new SQL file is provided, update it
    if (sqlFile) {
      const fileName = `${Date.now()}-${sqlFile.originalname}`;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      fs.writeFileSync(filePath, sqlFile.buffer);
      exerciseData.solutionQuery = fs.readFileSync(filePath, 'utf-8');
    }

    return this.prisma.exercise.update({
      where: { id },
      data: exerciseData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Deletes an exercise. Teachers can delete any, tutors only their own.
   * Throws ForbiddenException if not allowed.
   */
  async delete(id: number, userId: number, userRole: string = 'STUDENT') {
    const exercise = await this.findOne(id);

    // Check if user has permission to delete (ensure type safety)
    if (
      userRole !== 'TEACHER' &&
      Number(userId) !== Number(exercise.authorId)
    ) {
      throw new ForbiddenException('You can only delete your own exercises');
    }

    return this.prisma.exercise.delete({
      where: { id },
    });
  }
}
