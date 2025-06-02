import { Injectable, Logger } from '@nestjs/common';
import { Database } from '@prisma/client';
import { DatabaseImportService } from './database-import.service';
import { DatabaseExecutionService } from './database-execution.service';
import { DatabaseManagementService } from './database-management.service';
import {
  DatabaseCreateData,
  DatabaseUpdateData,
} from './interfaces/database.interfaces';

/**
 * Facade service that delegates to specialized database services
 */
@Injectable()
export class SqlImportService {
  private readonly logger = new Logger(SqlImportService.name);

  constructor(
    private databaseImport: DatabaseImportService,
    private databaseExecution: DatabaseExecutionService,
    private databaseManagement: DatabaseManagementService,
  ) {}

  /**
   * Import SQL from an uploaded file
   */
  async importSqlFile(
    file: Express.Multer.File,
    name?: string,
    authorId?: number,
  ): Promise<Database> {
    return this.databaseImport.importSqlFile(file, name, authorId);
  }

  /**
   * Execute a database query
   */
  async executeQuery(databaseId: number, query: string): Promise<any> {
    return this.databaseExecution.executeQuery(databaseId, query);
  }

  /**
   * Execute a database query for a student (uses temporary container)
   */
  async executeQueryForStudent(
    databaseId: number,
    query: string,
    studentId: number,
  ): Promise<any> {
    return this.databaseExecution.executeQueryForStudent(
      databaseId,
      query,
      studentId,
    );
  }

  /**
   * Reset a student's database container
   */
  async resetStudentContainer(
    databaseId: number,
    studentId: number,
  ): Promise<{ message: string }> {
    return this.databaseExecution.resetStudentContainer(databaseId, studentId);
  }

  /**
   * Initialize a student's database container when they start an exercise
   */
  async initializeStudentContainer(
    databaseId: number,
    studentId: number,
  ): Promise<void> {
    return this.databaseExecution.initializeStudentContainer(
      databaseId,
      studentId,
    );
  }

  /**
   * Get all available databases
   */
  async getAllDatabases() {
    return this.databaseManagement.getAvailableDatabases();
  }

  /**
   * Get a specific database by ID
   */
  async getDatabase(id: number) {
    return this.databaseManagement.getDatabaseById(id);
  }

  /**
   * Create a new database
   */
  async create(data: DatabaseCreateData) {
    return this.databaseManagement.createDatabaseEntry(
      data.name,
      data.schema || '',
      data.seedData || '',
      'Manual',
      data.authorId,
    );
  }

  /**
   * Update a database
   */
  async update(
    id: number,
    updateData: DatabaseUpdateData,
    userId: number,
    userRole: string,
    sqlFile?: Express.Multer.File,
  ) {
    // If there's a SQL file, process it through the database import service
    if (sqlFile) {
      // Use the importSqlFile method to get a processed database
      // but don't save it - just extract the schema and seed data
      try {
        const tempName = `temp_${new Date().getTime()}`;
        const processedDb = await this.databaseImport.importSqlFile(
          sqlFile,
          tempName,
          userId,
        );

        // Update the database with the new SQL content
        updateData.schema = processedDb.schema;
        updateData.seedData = processedDb.seedData || '';

        // Delete the temporary database since we only needed its processed schema
        await this.databaseManagement.deleteDatabase(
          processedDb.id,
          userId,
          userRole,
        );
      } catch (error) {
        this.logger.error('Error processing SQL file:', error);
        // Continue with the update even if SQL processing failed
      }
    }

    return this.databaseManagement.updateDatabase(
      id,
      updateData,
      userId,
      userRole,
    );
  }

  /**
   * Delete a database
   */
  async deleteDatabase(id: number, userId: number, userRole: string) {
    return this.databaseManagement.deleteDatabase(id, userId, userRole);
  }

  /**
   * Execute a batch of SQL statements
   */
  async executeBatch(
    databaseId: number,
    statements: string[],
    // Deliberately omitted options parameter (available for future use)
  ) {
    return this.databaseExecution.validateAndExecuteSqlOnDatabase(
      databaseId,
      statements.join(';\n'),
    );
  }

  /**
   * Create a database from SQL content
   */
  async createDatabaseFromContent(
    sqlContent: string,
    name: string,
    authorId?: number,
  ): Promise<Database> {
    return this.databaseImport.createDatabaseFromSqlContent(
      sqlContent,
      name,
      authorId,
    );
  }
}
