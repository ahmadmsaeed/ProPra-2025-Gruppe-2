import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseOwnershipService } from '../common/services/database-ownership.service';
import { DatabaseAuditService } from '../common/services/database-audit.service';
import { DatabaseTableManagerService } from '../common/services/database-table-manager.service';
import { SqlProcessorService } from '../common/services/sql-processor.service';
import { DatabaseImportService } from './database-import.service';

/**
 * Service for handling database management operations
 */
@Injectable()
export class DatabaseManagementService {
  constructor(
    private prisma: PrismaService,
    private databaseOwnership: DatabaseOwnershipService,
    private databaseAudit: DatabaseAuditService,
    private tableManager: DatabaseTableManagerService,
    private sqlProcessor: SqlProcessorService,
    @Inject(forwardRef(() => DatabaseImportService))
    private databaseImport: DatabaseImportService,
  ) {}

  /**
   * Get all available databases
   */
  async getAvailableDatabases() {
    const databases = await this.prisma.database.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        authorId: true,
        author: {
          select: {
            name: true,
          },
        },
      } as any,
      orderBy: { id: 'desc' },
    });

    // Transform the result to include a clean "uploadedBy" field
    return databases.map((db) => ({
      id: db.id,
      name: db.name,
      createdAt: db.createdAt,
      authorId: db.authorId,
      uploadedBy:
        db.author && typeof db.author === 'object' && 'name' in db.author
          ? db.author.name
          : 'Unknown',
    }));
  }

  /**
   * Returns a single database schema by ID.
   */
  async findOne(id: number) {
    const database = await this.prisma.database.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    // Add a clean uploadedBy field
    return {
      ...database,
      uploadedBy:
        database.author &&
        typeof database.author === 'object' &&
        'name' in database.author
          ? database.author.name
          : 'Unknown',
    };
  }

  /**
   * Get a specific database by ID
   */
  async getDatabaseById(id: number) {
    const database = await this.prisma.database.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        schema: true,
        seedData: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        author: {
          select: {
            name: true,
          },
        },
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    return database;
  }

  /**
   * Creates a new database schema.
   */
  async create(data: any) {
    return this.prisma.database.create({
      data,
    });
  }

  /**
   * Updates an existing database schema.
   * Only the author or a teacher can update the database.
   * If a new SQL file is provided, also updates the schema and seedData.
   */
  async update(
    id: number,
    data: any,
    userId?: number,
    userRole?: string,
    sqlFile?: Express.Multer.File,
  ) {
    // Find the database
    const database = await this.findOne(id);

    // Check if user has permission to update
    await this.databaseOwnership.validateEditPermission(
      id,
      userId || 0,
      userRole || '',
    );

    // If SQL file is provided, process it and update the schema
    if (sqlFile) {
      // Import the SQL file and get updated database properties
      const importedDb = await this.databaseImport.importSqlFile(
        sqlFile,
        database.name,
        userId
      );
      
      // Update only the schema and seedData from the imported database
      data.schema = importedDb.schema;
      data.seedData = importedDb.seedData;
      
      // Clean up the temporarily created database
      await this.prisma.database
        .delete({
          where: { id: importedDb.id },
        })
        .catch((err) => console.error('Failed to delete temporary database:', err));
    }

    // Log the update
    this.databaseAudit.logDatabaseUpdate(database, userId || null, data);

    // Update the database entry
    return this.prisma.database.update({
      where: { id },
      data,
    });
  }

  /**
   * Update a database
   */
  async updateDatabase(
    id: number,
    updateData: any,
    userId: number,
    userRole: string,
  ) {
    // Check if user has permission to edit
    await this.databaseOwnership.validateEditPermission(id, userId, userRole);

    // Get the current database
    const database = await this.prisma.database.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        schema: true,
        seedData: true,
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    // Update the database
    const updatedDatabase = await this.prisma.database.update({
      where: { id },
      data: updateData,
    });

    // Log the update
    this.databaseAudit.logDatabaseUpdate(database, userId, updateData);

    return updatedDatabase;
  }

  /**
   * Deletes a database schema by ID.
   * Only the author or a teacher can delete the database.
   * Also drops the corresponding tables in PostgreSQL.
   */
  async delete(id: number, userId?: number, userRole?: string) {
    // Find the database
    const database = await this.findOne(id);

    // Check if user has permission to delete
    await this.databaseOwnership.validateDeletePermission(
      id,
      userId || 0,
      userRole || '',
    );

    try {
      // Before deleting the database entry, drop its tables from PostgreSQL
      const droppedTables = await this.tableManager.dropDatabaseTables(database);

      // Log the deletion event
      this.databaseAudit.logDatabaseDeletion(
        database,
        userId || null,
        droppedTables,
      );

      // Now delete the database entry
      return await this.prisma.database.delete({
        where: { id },
      });
    } catch (error) {
      // Check if this is a foreign key constraint error (database is in use)
      if (
        error.code === 'P2003' ||
        error.message.includes('foreign key constraint')
      ) {
        throw new BadRequestException(
          'This database cannot be deleted because it is being used by one or more exercises.',
        );
      }
      throw error;
    }
  }

  /**
   * Delete a database
   */
  async deleteDatabase(
    id: number,
    userId: number,
    userRole: string,
  ) {
    // Check if user has permission to delete
    await this.databaseOwnership.validateDeletePermission(id, userId, userRole);

    // Get the current database
    const database = await this.prisma.database.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        schema: true,
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    // Drop the associated database tables
    const droppedTables = await this.tableManager.dropDatabaseTables(database);

    // Delete the database entry
    await this.prisma.database.delete({
      where: { id },
    });

    // Log the deletion
    this.databaseAudit.logDatabaseDeletion(database, userId, droppedTables);

    return { message: `Database ${database.name} deleted successfully` };
  }

  /**
   * Creates a database entry from processed SQL data
   * This database will be visible to all users (students, tutors, and teachers)
   */
  async createDatabaseEntry(
    name: string,
    schema: string,
    seedData: string,
    fileType: string,
    authorId?: number,
  ) {
    // Analyze tables in the SQL content for better cleanup later
    const tableInfo = this.tableManager.analyzeTableStructure(schema);
    console.log(
      `Database "${name}" contains tables: ${tableInfo.tableNames.join(', ') || 'none detected'}`,
    );

    // Validate the schema
    const validationResult = await this.validateDatabaseSchemaAndTables(schema, tableInfo);
    
    console.log(`Creating database entry with name: ${name} - This database will be visible to all users`);

    // Create database entry - all databases are visible to all users
    const database = await this.prisma.database.create({
      data: {
        name: name,
        schema: schema,
        seedData: seedData,
        authorId: authorId,
      } as any,
    });

    // Log database creation
    this.databaseAudit.logDatabaseCreation(
      database,
      authorId || null,
      tableInfo,
    );

    return database;
  }
  
  /**
   * Validates schema and tables before creating a database
   */
  private async validateDatabaseSchemaAndTables(schema: string, tableInfo: any) {
    const schemaValidationSvc = new (await import('../common/services/database-validator.service')).DatabaseValidatorService();
    
    // Validate the schema
    const validationResult = schemaValidationSvc.validateSchema(schema);
    if (!validationResult.valid) {
      throw new BadRequestException(
        `Invalid SQL schema: ${validationResult.reason}`,
      );
    }

    // Validate table names
    const tableNameValidation = schemaValidationSvc.validateTableNames(
      tableInfo.tableNames,
    );
    if (!tableNameValidation.valid) {
      throw new BadRequestException(
        `Table name validation failed: ${tableNameValidation.reason}`,
      );
    }
    
    return validationResult;
  }
  
  /**
   * Creates a database from SQL file content
   */
  async createDatabaseFromContent(
    sqlContent: string,
    name: string,
    authorId?: number,
  ) {
    try {
      // Use SQL processor to prepare the content
      const processorSvc = new (await import('../common/services/sql-processor.service')).SqlProcessorService();
      const converterSvc = new (await import('../common/services/mysql-converter.service')).MySqlConverterService(processorSvc);
      
      // Process the SQL content
      const processedData = processorSvc.processSqlFileContent(
        sqlContent,
        name || 'database',
        converterSvc
      );
      
      // Generate a unique name if not provided
      const uniqueName = name || processorSvc.generateUniqueDatabaseName(
        'database', 
        processedData.fileType
      );
      
      // Create the database entry
      const database = await this.createDatabaseEntry(
        uniqueName,
        processedData.schema,
        processedData.seedData,
        processedData.fileType,
        authorId
      );

      return database;
    } catch (error) {
      console.error('Error in createDatabaseFromContent:', error);
      throw new BadRequestException(
        `Failed to create database from content: ${error.message}`,
      );
    }
  }
}