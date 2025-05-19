/**
 * Service for exercise management (CRUD, file upload, permission checks, etc.).
 * Handles creation, update, and deletion of exercises, including database schema upload.
 */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';
import { User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { IExerciseService } from './interfaces/exercise.service.interface';

@Injectable()
export class ExerciseService implements IExerciseService {
  constructor(
    private prisma: PrismaService,
    private databaseService: DatabaseService
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
            role: true
          }
        },
        database: {
          select: {
            id: true,
            name: true,
            schema: true,
            seedData: true
          }
        }
      }
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
            role: true
          }
        }
      }
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
  async create(data: any) {
    const { sqlFile, databaseSchemaId, authorId, ...exerciseData } = data;
    
    // Validate authorId
    if (!authorId || typeof authorId !== 'number' || isNaN(authorId)) {
      throw new BadRequestException('authorId is required and must be a valid number.');
    }

    // If SQL file is provided, create a new database first
    if (sqlFile) {
      const fileName = `${Date.now()}-${sqlFile.originalname}`;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, sqlFile.buffer);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Split into schema and seedData
      const lines = sqlContent.split(/;\s*\n/);
      let schema = '';
      let seedData = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
          schema += trimmed + ';\n';
        } else if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
          seedData += trimmed + ';\n';
        }
      }

      const baseName = path.basename(sqlFile.originalname, path.extname(sqlFile.originalname));
      const uniqueDbName = `${baseName}-${Date.now()}`;

      const newDatabase = await this.prisma.database.create({
        data: {
          name: uniqueDbName,
          schema,
          seedData
        }
      });

      // Create the exercise with the new database
      return this.prisma.exercise.create({
        data: {
          ...exerciseData,
          authorId,
          databaseSchemaId: newDatabase.id,
          solutionQuery: exerciseData.solutionQuery
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          database: {
            select: {
              id: true,
              name: true,
              schema: true,
              seedData: true
            }
          }
        }
      });
    }

    // If no SQL file, require databaseSchemaId
    if (!databaseSchemaId || typeof databaseSchemaId !== 'number' || isNaN(databaseSchemaId)) {
      throw new BadRequestException('databaseSchemaId is required when no SQL file is provided.');
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
            role: true
          }
        },
        database: {
          select: {
            id: true,
            name: true,
            schema: true,
            seedData: true
          }
        }
      }
    });
  }

  /**
   * Updates an existing exercise. Only the author (or teacher) can update.
   * If a new SQL file is provided, updates the solutionQuery.
   */
  async update(id: number, data: any) {
    const exercise = await this.findOne(id);
    
    // Check if user has permission to update
    if (data.authorId !== exercise.authorId) {
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
            role: true
          }
        }
      }
    });
  }

  /**
   * Deletes an exercise. Teachers can delete any, tutors only their own.
   * Throws ForbiddenException if not allowed.
   */
  async delete(id: number, user: User) {
    const exercise = await this.findOne(id);

    // Check if user has permission to delete (ensure type safety)
    if (user.role !== 'TEACHER' && Number(user.id) !== Number(exercise.authorId)) {
      throw new ForbiddenException('You can only delete your own exercises');
    }

    return this.prisma.exercise.delete({
      where: { id }
    });
  }
}
