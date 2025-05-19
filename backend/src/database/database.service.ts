/**
 * Service for database schema management (CRUD for database schemas).
 * Handles creation, update, and deletion of database schemas.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns all database schemas.
   */
  async findAll() {
    return this.prisma.database.findMany();
  }

  /**
   * Returns a single database schema by ID.
   */
  async findOne(id: number) {
    return this.prisma.database.findUnique({
      where: { id }
    });
  }

  /**
   * Creates a new database schema.
   */
  async create(data: any) {
    return this.prisma.database.create({
      data
    });
  }

  /**
   * Updates an existing database schema.
   */
  async update(id: number, data: any) {
    return this.prisma.database.update({
      where: { id },
      data
    });
  }

  /**
   * Deletes a database schema by ID.
   */
  async delete(id: number) {
    return this.prisma.database.delete({
      where: { id }
    });
  }
} 