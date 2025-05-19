/**
 * Controller for database schema management endpoints (CRUD for database schemas).
 * All routes are protected by JWT and role guards.
 */
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateDatabaseDto } from './dto/create-database.dto';

@Controller('databases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all database schemas.
   */
  @Get()
  async getAllDatabases() {
    return this.databaseService.findAll();
  }

  /**
   * Get a single database schema by ID.
   */
  @Get(':id')
  async getDatabase(@Param('id') id: string) {
    return this.databaseService.findOne(+id);
  }

  /**
   * Create a new database schema (teachers only).
   */
  @Post()
  @Roles(Role.TEACHER)
  async createDatabase(@Body() data: CreateDatabaseDto) {
    return this.databaseService.create(data);
  }

  /**
   * Update a database schema (teachers only).
   */
  @Patch(':id')
  @Roles(Role.TEACHER)
  async updateDatabase(@Param('id') id: string, @Body() data: CreateDatabaseDto) {
    return this.databaseService.update(+id, data);
  }

  /**
   * Delete a database schema (teachers only).
   */
  @Delete(':id')
  @Roles(Role.TEACHER)
  async deleteDatabase(@Param('id') id: string) {
    return this.databaseService.delete(+id);
  }
} 