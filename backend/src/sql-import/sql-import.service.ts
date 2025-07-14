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
   * Get database structure for visualization
   */
  async getDatabaseStructure(id: number) {
    const database = await this.databaseManagement.getDatabaseById(id);
    
    // Parse the schema to extract table and relationship information
    const structure = this.parseDatabaseStructure(database.schema);
    
    return {
      id: database.id,
      name: database.name,
      structure
    };
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

  /**
   * Parse database schema to extract structure information
   */
  private parseDatabaseStructure(schema: string) {
    const tables: any[] = [];
    const relationships: any[] = [];
    
    // Extract table names and their columns
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
    let match;
    
    while ((match = tableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      const columns = this.parseColumns(tableDefinition);
      const primaryKeys = this.extractPrimaryKeys(tableDefinition);
      const foreignKeys = this.extractForeignKeys(tableDefinition);
      
      tables.push({
        name: tableName,
        columns,
        primaryKeys,
        foreignKeys
      });
      
      // Add relationships from foreign keys
      foreignKeys.forEach(fk => {
        relationships.push({
          from: tableName,
          to: fk.referencesTable,
          fromColumn: fk.column,
          toColumn: fk.referencesColumn,
          type: 'foreign_key'
        });
      });
    }
    
    return {
      tables,
      relationships
    };
  }

  /**
   * Parse column definitions from table definition
   */
  private parseColumns(tableDefinition: string) {
    const columns: any[] = [];
    const lines = tableDefinition.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('PRIMARY KEY') || trimmedLine.startsWith('FOREIGN KEY')) {
        continue;
      }
      
      const columnMatch = trimmedLine.match(/^["']?(\w+)["']?\s+([A-Za-z0-9\(\)]+)(.*)$/i);
      if (columnMatch) {
        const name = columnMatch[1];
        const type = columnMatch[2];
        const constraints = columnMatch[3] ? columnMatch[3].trim() : '';
        
        columns.push({
          name,
          type,
          constraints,
          isNullable: !constraints.includes('NOT NULL'),
          isPrimary: constraints.includes('PRIMARY KEY')
        });
      }
    }
    
    return columns;
  }

  /**
   * Extract primary key information
   */
  private extractPrimaryKeys(tableDefinition: string) {
    const primaryKeys: string[] = [];
    
    // Look for PRIMARY KEY constraint
    const pkMatch = tableDefinition.match(/PRIMARY\s+KEY\s*\(\s*["']?(\w+)["']?\s*\)/i);
    if (pkMatch) {
      primaryKeys.push(pkMatch[1]);
    }
    
    // Also check for inline PRIMARY KEY
    const lines = tableDefinition.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('PRIMARY KEY')) {
        const columnMatch = trimmedLine.match(/^["']?(\w+)["']?/);
        if (columnMatch) {
          primaryKeys.push(columnMatch[1]);
        }
      }
    }
    
    return primaryKeys;
  }

  /**
   * Extract foreign key information
   */
  private extractForeignKeys(tableDefinition: string) {
    const foreignKeys: any[] = [];
    
    const fkRegex = /FOREIGN\s+KEY\s*\(\s*["']?(\w+)["']?\s*\)\s+REFERENCES\s+["']?(\w+)["']?\s*\(\s*["']?(\w+)["']?\s*\)/gi;
    let match;
    
    while ((match = fkRegex.exec(tableDefinition)) !== null) {
      foreignKeys.push({
        column: match[1],
        referencesTable: match[2],
        referencesColumn: match[3]
      });
    }
    
    return foreignKeys;
  }
}
