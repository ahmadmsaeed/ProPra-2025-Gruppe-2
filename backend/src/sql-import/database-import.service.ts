import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Database } from '../types/models';
import { ErrorService } from '../common/services/error.service';
import { SqlProcessorService } from '../common/services/sql-processor.service';
import { MySqlConverterService } from '../common/services/mysql-converter.service';
import { FileService } from '../common/services/file.service';
import { DatabaseValidatorService } from '../common/services/database-validator.service';
import { DatabaseExecutionService } from './database-execution.service';
import { DatabaseManagementService } from './database-management.service';

@Injectable()
export class DatabaseImportService {
  constructor(
    private readonly errorService: ErrorService,
    private readonly sqlProcessor: SqlProcessorService,
    private readonly mysqlConverter: MySqlConverterService,
    private readonly fileService: FileService,
    private readonly databaseValidator: DatabaseValidatorService,
    private readonly databaseExecution: DatabaseExecutionService,
    @Inject(forwardRef(() => DatabaseManagementService))
    private readonly databaseManagement: DatabaseManagementService,
  ) {}

  async importSqlFile(
    file: Express.Multer.File,
    name?: string,
    authorId?: number,
  ): Promise<Database & { warnings?: string[] }> {
    try {
      const fileContent = file.buffer.toString('utf-8');

      const validationResult =
        await this.databaseValidator.validateSqlFileContent(fileContent);
      if (!validationResult.valid) {
        throw new BadRequestException({
          message: validationResult.reason,
          code: 'VALIDATION_ERROR',
        });
      }

      const processedData = await this.sqlProcessor.processSqlFileContent(
        fileContent,
        file.originalname,
        this.mysqlConverter,
      );

      const databaseName =
        name ||
        this.sqlProcessor.generateUniqueDatabaseName(
          file.originalname,
          processedData.fileType,
        );

      const warnings: string[] = [];

      const database = await this.databaseManagement.createDatabaseEntry(
        databaseName,
        processedData.schema,
        processedData.seedData,
        processedData.fileType,
        authorId,
      );

      try {
        const executionResult = await this.databaseExecution.executeSqlScript(
          processedData.processedSql,
          { useTransaction: true },
        );

        if (executionResult.warnings?.length) {
          warnings.push(...executionResult.warnings);
        }

        if (!executionResult.success) {
          try {
            await this.databaseManagement.deleteDatabase(
              database.id,
              authorId || 0,
              'SYSTEM',
            );
          } catch (err) {
            console.error('Failed to clean up database after error:', err);
          }

          throw new BadRequestException({
            message:
              executionResult.message || 'Failed to execute SQL statements',
            code: 'EXECUTION_ERROR',
          });
        }
      } catch (error: any) {
        try {
          await this.databaseManagement.deleteDatabase(
            database.id,
            authorId || 0,
            'SYSTEM',
          );
        } catch (err) {
          console.error('Failed to clean up database after error:', err);
        }

        if (error.code === '23505') {
          throw new BadRequestException({
            message:
              'Die Datenbank enthält Daten, die bereits existieren und nicht überschrieben werden können.',
            code: 'DUPLICATE_DATA',
            detail: error.detail,
          });
        }

        throw error;
      }

      return warnings.length > 0 ? { ...database, warnings } : database;
    } catch (error: any) {
      console.error('Error in importSqlFile:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMsg = this.errorService.handlePostgresError(error);
      throw this.errorService.createBadRequestException(
        `SQL-Datei konnte nicht importiert werden: ${errorMsg}`,
      );
    }
  }

  async createDatabaseFromSqlContent(
    sqlContent: string,
    baseName: string,
    authorId?: number,
  ): Promise<Database> {
    try {
      return await this.databaseManagement.createDatabaseFromContent(
        sqlContent,
        baseName,
        authorId,
      );
    } catch (error: any) {
      console.error('Error in createDatabaseFromSqlContent:', error);
      throw new BadRequestException(
        `Failed to process SQL content: ${error.message}`,
      );
    }
  }
}