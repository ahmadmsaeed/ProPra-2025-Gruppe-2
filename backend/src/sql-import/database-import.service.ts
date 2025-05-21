import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Database } from '@prisma/client';
import { ErrorService } from '../common/services/error.service';
import { SqlProcessorService } from '../common/services/sql-processor.service';
import { MySqlConverterService } from '../common/services/mysql-converter.service';
import { FileService } from '../common/services/file.service';
import { DatabaseValidatorService } from '../common/services/database-validator.service';
import { DatabaseExecutionService } from './database-execution.service';
import { DatabaseManagementService } from './database-management.service';

/**
 * Service for handling database import operations
 * Acts as a coordinator between specialized services
 */
@Injectable()
export class DatabaseImportService {
  constructor(
    private errorService: ErrorService,
    private sqlProcessor: SqlProcessorService,
    private mysqlConverter: MySqlConverterService,
    private fileService: FileService,
    private databaseValidator: DatabaseValidatorService,
    private databaseExecution: DatabaseExecutionService,
    @Inject(forwardRef(() => DatabaseManagementService))
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
    try {
      // Get file content
      const fileContent = file.buffer.toString('utf-8');

      // Validate the SQL content for security issues
      const validationResult = this.databaseValidator.validateSqlFileContent(fileContent);
      if (!validationResult.valid) {
        throw new BadRequestException(validationResult.reason);
      }
      
      // Process the SQL content through the processor service
      const processedData = this.sqlProcessor.processSqlFileContent(
        fileContent,
        file.originalname,
        this.mysqlConverter
      );
      
      // Generate a unique name or use the provided one
      const databaseName = name || this.sqlProcessor.generateUniqueDatabaseName(
        file.originalname, 
        processedData.fileType
      );
      
      // Create the database entry
      const database = await this.databaseManagement.createDatabaseEntry(
        databaseName,
        processedData.schema,
        processedData.seedData,
        processedData.fileType,
        authorId
      );

      // Execute the SQL statements
      try {
        await this.databaseExecution.executeSqlScript(processedData.processedSql);
      } catch (error) {
        // Log the execution error but don't fail the import
        console.error(`SQL execution error during import: ${error.message}`);
        
        // If there's an error with the SQL, we should clean up the database entry
        // that was just created to avoid orphaned database records
        throw error;
      }

      return database;
    } catch (error) {
      console.error('Error in importSqlFile:', error);
      const errorMsg = this.errorService.handlePostgresError(error);
      throw this.errorService.createBadRequestException(
        `SQL-Datei konnte nicht importiert werden: ${errorMsg}`,
      );
    }
  }

  /**
   * Creates a new database from SQL content (for use by ExerciseService)
   */
  async createDatabaseFromSqlContent(
    sqlContent: string,
    baseName: string,
    authorId?: number,
  ): Promise<Database> {
    try {
      return await this.databaseManagement.createDatabaseFromContent(
        sqlContent,
        baseName,
        authorId
      );
    } catch (error) {
      console.error('Error in createDatabaseFromSqlContent:', error);
      throw new BadRequestException(
        `Failed to process SQL content: ${error.message}`,
      );
    }
  }
}