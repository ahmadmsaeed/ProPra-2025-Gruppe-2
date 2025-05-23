import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../types/models';

@Injectable()
export class DatabaseOwnershipService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validates if a user has permission to view a database
   * All authenticated users (STUDENT, TUTOR, TEACHER) can view all databases
   * This ensures that databases imported by tutors or teachers are visible to everyone
   */
  async canViewDatabase(databaseId: number): Promise<boolean> {
    const database = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });

    // All databases are visible to all authenticated users
    return !!database;
  }

  /**
   * Validates if a user has permission to edit a database
   * Only TEACHER or the TUTOR who created the database can edit it
   */
  async canEditDatabase(
    databaseId: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    if (userRole === Role.TEACHER) {
      return true; // Teachers can edit any database
    }

    if (userRole !== Role.TUTOR) {
      return false; // Only teachers and tutors can edit databases
    }

    // Tutors can only edit their own databases
    const database = await this.prisma.database.findUnique({
      where: { id: databaseId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${databaseId} not found`);
    }

    // Need to check if authorId exists before comparing
    return database.authorId === userId;
  }

  /**
   * Validates if a user has permission to delete a database
   * Only TEACHER or the TUTOR who created the database can delete it
   */
  async canDeleteDatabase(
    databaseId: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    // Same permission logic as editing
    return this.canEditDatabase(databaseId, userId, userRole);
  }

  /**
   * Checks if user can edit and throws an exception if not
   */
  async validateEditPermission(
    databaseId: number,
    userId: number,
    userRole: string,
  ): Promise<void> {
    const canEdit = await this.canEditDatabase(databaseId, userId, userRole);
    if (!canEdit) {
      throw new ForbiddenException(
        'You do not have permission to edit this database',
      );
    }
  }

  /**
   * Checks if user can delete and throws an exception if not
   */
  async validateDeletePermission(
    databaseId: number,
    userId: number,
    userRole: string,
  ): Promise<void> {
    const canDelete = await this.canDeleteDatabase(
      databaseId,
      userId,
      userRole,
    );
    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this database',
      );
    }
  }
}
