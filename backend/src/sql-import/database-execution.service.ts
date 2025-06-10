import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorService } from '../common/services/error.service';
import { SqlValidatorService } from '../common/services/sql-validator.service';
import { SqlProcessorService } from '../common/services/sql-processor.service';
import { DatabaseContainerService } from './database-container.service';

// PostgreSQL error interface for better type safety
interface PostgreSQLError extends Error {
  message: string;
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

// Type guard for PostgreSQL errors
function isPostgreSQLError(error: unknown): error is PostgreSQLError {
  return error instanceof Error && 'code' in error;
}

// Type guard for errors with message property
function hasErrorMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

@Injectable()
export class DatabaseExecutionService {
  private readonly logger = new Logger(DatabaseExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private errorService: ErrorService,
    private sqlValidator: SqlValidatorService,
    private sqlProcessor: SqlProcessorService,
    private containerService: DatabaseContainerService,
  ) {}

  /**
   * Execute a database query against a specific database
   * For administrators - executes directly on original database
   */
  async executeQuery(databaseId: number, query: string): Promise<any> {
    return this.executeQueryDirect(databaseId, query);
  }

  /**
   * Execute a database query for a student using a temporary container
   */
  async executeQueryForStudent(
    databaseId: number,
    query: string,
    studentId: number,
  ): Promise<any> {
    const dbEntry = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });
    if (!dbEntry) {
      throw new NotFoundException(`Database with ID ${databaseId} not found.`);
    }

    // Validate query for safety
    const validationResult = this.sqlValidator.validateSqlSafety(query);
    if (!validationResult.valid) {
      throw new BadRequestException(
        `Query execution failed: ${validationResult.reason}`,
      );
    }

    try {
      // Create or get temporary container for this student and database
      await this.containerService.createTemporaryContainer(
        studentId,
        databaseId,
      );

      // Execute query on the temporary container using the new interface
      return await this.containerService.executeQueryOnContainer(
        studentId,
        databaseId,
        query,
      );
    } catch (error) {
      this.logger.error('Error executing query on temporary container:', error);
      const errorMsg = this.errorService.handlePostgresError(
        error as PostgreSQLError,
      );

      // Check if this is a "relation does not exist" error and provide a more helpful message
      if (
        hasErrorMessage(error) &&
        error.message.includes('relation') &&
        error.message.includes('does not exist')
      ) {
        // Extract the table name from the error message if possible
        const errorMessage = hasErrorMessage(error) ? error.message : '';
        const tableNameMatch = errorMessage.match(
          /relation "([^"]+)" does not exist/,
        );
        const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';

        throw this.errorService.createBadRequestException(
          `Die Tabelle "${tableName}" existiert nicht. Bitte überprüfen Sie das Datenbankschema und stellen Sie sicher, dass die Tabelle erstellt wurde.`,
        );
      }

      throw this.errorService.createBadRequestException(
        `Query execution failed: ${errorMsg}`,
      );
    }
  }

  /**
   * Execute a database query directly on the original database (for admins)
   */
  private async executeQueryDirect(
    databaseId: number,
    query: string,
  ): Promise<any> {
    const dbEntry = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });
    if (!dbEntry) {
      throw new NotFoundException(`Database with ID ${databaseId} not found.`);
    }

    // Validate query for safety
    const validationResult = this.sqlValidator.validateSqlSafety(query);
    if (!validationResult.valid) {
      throw new BadRequestException(
        `Query execution failed: ${validationResult.reason}`,
      );
    }

    try {
      // Check if the query contains multiple statements
      const statements = this.sqlProcessor.splitIntoStatements(query);
      
      if (statements.length === 1) {
        // Single statement - execute directly
        return await this.prisma.$queryRawUnsafe(query);
      } else {
        // Multiple statements - execute sequentially and return the last result
        let lastResult: any = [];
        
        for (const statement of statements) {
          const trimmedStatement = statement.trim();
          if (trimmedStatement) {
            // For SELECT statements, use $queryRawUnsafe to get results
            // For other statements (DELETE, UPDATE, etc.), use $executeRawUnsafe
            if (trimmedStatement.toUpperCase().startsWith('SELECT')) {
              lastResult = await this.prisma.$queryRawUnsafe(trimmedStatement);
            } else {
              await this.prisma.$executeRawUnsafe(trimmedStatement);
              // For non-SELECT statements, we'll keep the previous result or set empty array
              if (!trimmedStatement.toUpperCase().startsWith('SELECT')) {
                // Only update lastResult if this is the last statement and it's not a SELECT
                const isLastStatement = statement === statements[statements.length - 1];
                if (isLastStatement) {
                  lastResult = []; // Return empty array for non-SELECT final statements
                }
              }
            }
          }
        }
        
        return lastResult;
      }
    } catch (error) {
      this.logger.error('Error executing query:', error);
      const errorMsg = this.errorService.handlePostgresError(
        error as PostgreSQLError,
      );

      // Check if this is a "relation does not exist" error and provide a more helpful message
      if (
        hasErrorMessage(error) &&
        error.message.includes('relation') &&
        error.message.includes('does not exist')
      ) {
        // Extract the table name from the error message if possible
        const errorMessage = hasErrorMessage(error) ? error.message : '';
        const tableNameMatch = errorMessage.match(
          /relation "([^"]+)" does not exist/,
        );
        const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';

        throw this.errorService.createBadRequestException(
          `Die Tabelle "${tableName}" existiert nicht. Bitte überprüfen Sie das Datenbankschema und stellen Sie sicher, dass die Tabelle erstellt wurde.`,
        );
      }

      throw this.errorService.createBadRequestException(
        `Query execution failed: ${errorMsg}`,
      );
    }
  }

  /**
   * Execute a batch of SQL statements
   * Returns information about execution success, warnings, and errors
   * @param statements Array of SQL statements to execute
   * @param options.batchSize Number of statements to execute in each batch (default: 10)
   * @param options.useTransaction Whether to use a transaction (default: true)
   */
  async executeStatements(
    statements: string[],
    options: { batchSize?: number; useTransaction?: boolean } = {},
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    // Track errors to provide comprehensive feedback
    const errors: string[] = [];
    // Track warnings for non-critical errors
    const warnings: string[] = [];
    // Track successful statements
    let successCount = 0;

    // Default to using transactions
    const useTransaction = options.useTransaction !== false;

    // Filter out empty statements
    const validStatements = statements.filter((stmt) => stmt.trim().length > 0);

    this.logger.log(
      `Executing ${validStatements.length} SQL statements ${useTransaction ? 'in transaction' : 'without transaction'}`,
    );

    // First, categorize statements
    const createTableStatements = validStatements.filter((stmt) =>
      stmt.trim().toUpperCase().startsWith('CREATE TABLE'),
    );

    const insertStatements = validStatements.filter((stmt) =>
      stmt.trim().toUpperCase().startsWith('INSERT INTO'),
    );

    const otherStatements = validStatements.filter(
      (stmt) =>
        !stmt.trim().toUpperCase().startsWith('CREATE TABLE') &&
        !stmt.trim().toUpperCase().startsWith('INSERT INTO'),
    );

    this.logger.log(
      `Statement breakdown: ${createTableStatements.length} CREATE TABLE, ` +
        `${otherStatements.length} other DDL, ${insertStatements.length} INSERT INTO`,
    );

    // First execute all CREATE TABLE statements
    for (const statement of createTableStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
        this.logger.debug(`Successfully executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        this.logger.debug(
          `Handling CREATE TABLE error: ${isPostgreSQLError(err) ? err.code || 'unknown' : 'unknown'}`,
        );
        // Non-critical errors like table already exists should not prevent further execution
      }
    }

    // Then execute all other DDL statements
    for (const statement of otherStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
        this.logger.debug(`Successfully executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        this.logger.debug(
          `Handling DDL error: ${isPostgreSQLError(err) ? err.code || 'unknown' : 'unknown'}`,
        );
      }
    }

    // Finally execute all INSERT statements
    for (const statement of insertStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        this.logger.debug(
          `Handling INSERT error: ${isPostgreSQLError(err) ? err.code || 'unknown' : 'unknown'}`,
        );
      }
    }

    // Build the appropriate response
    return this.buildExecutionResponse(successCount, errors, warnings);
  }

  /**
   * Handle errors from statement execution
   */
  private handleStatementError(
    statement: string,
    err: any,
    errors: string[],
    warnings: string[],
  ): void {
    // Use the error service to generate a user-friendly error message
    const errorMsg = this.errorService.handlePostgresError(
      err as PostgreSQLError,
    );

    // Add statement info to error message for better debugging
    const statementInfo =
      statement.substring(0, 50) + (statement.length > 50 ? '...' : '');
    const enhancedMessage = `[${statementInfo}] ${errorMsg}`;

    // Determine if this is a critical error or just a warning
    if (this.errorService.isNonCriticalError(err as PostgreSQLError)) {
      this.logger.warn(
        `Non-critical error in statement: ${enhancedMessage}`,
        isPostgreSQLError(err) ? err.code : 'unknown',
      );
      warnings.push(enhancedMessage);
    } else {
      this.logger.error(
        `Critical error in statement: ${enhancedMessage}`,
        isPostgreSQLError(err) ? err.code : 'unknown',
      );
      errors.push(enhancedMessage);
    }
  }

  /**
   * Build the execution response object
   */
  private buildExecutionResponse(
    successCount: number,
    errors: string[],
    warnings: string[],
  ): {
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  } {
    let importMessage = '';

    // If we have critical errors, indicate it in the message
    if (errors.length > 0) {
      importMessage = `Der Import wurde mit Fehlern abgeschlossen. ${successCount} Statement(s) erfolgreich ausgeführt.`;
      importMessage += `\nFehler: ${errors.join(' | ')}`;

      if (warnings.length > 0) {
        importMessage += `\nWarnungen (existierende Daten übersprungen): ${warnings.join(' | ')}`;
      }

      return {
        success: false,
        successCount,
        errors,
        warnings,
        message: importMessage,
      };
    }

    // No critical errors, but maybe warnings
    importMessage = `Import erfolgreich abgeschlossen. ${successCount} Statement(s) erfolgreich ausgeführt.`;

    if (warnings.length > 0) {
      importMessage += `\nInformationen: Einige Daten wurden übersprungen, da sie bereits existieren.`;
    }

    return {
      success: true,
      successCount,
      errors,
      warnings,
      message: importMessage,
    };
  }

  /**
   * Executes a complete set of SQL statements with optimized execution order
   * and handling of schema/data separation
   */
  async executeSqlScript(
    sqlContent: string,
    options: {
      validateOnly?: boolean;
      useTransaction?: boolean;
      executionId?: string;
    } = {},
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    // Split the SQL into individual statements first
    const statements = this.sqlProcessor.splitIntoStatements(sqlContent);
    this.logger.debug(`SQL split into ${statements.length} statements`);

    // Log a sample of statements for debugging
    if (statements.length > 0) {
      this.logger.debug('First statement preview:', statements[0].substring(0, 100));
      if (statements.length > 1) {
        this.logger.debug(
          'Second statement preview:',
          statements[1].substring(0, 100),
        );
      }
    }

    // Validate SQL statements for safety
    const validationResults = this.sqlValidator.validateSqlStatements(
      sqlContent,
      statements,
    );
    const invalidStatements = validationResults.filter((r) => !r.valid);

    if (invalidStatements.length > 0) {
      const errorMessage = `SQL contains potentially harmful statements: ${invalidStatements.map((s) => s.reason).join(' | ')}`;
      throw new BadRequestException(errorMessage);
    }

    // If this is validation only, return success
    if (options.validateOnly) {
      return {
        success: true,
        successCount: 0,
        errors: [],
        warnings: [],
        message: 'SQL validation successful. No statements executed.',
      };
    }

    // Execute statements in optimized order
    return this.executeStatements(statements, {
      useTransaction: options.useTransaction ?? false,
    });
  }

  /**
   * Validates and executes SQL content on a specific database
   */
  async validateAndExecuteSqlOnDatabase(
    databaseId: number,
    sqlContent: string,
  ): Promise<{
    success: boolean;
    message: string;
    warnings: string[];
  }> {
    const dbEntry = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });

    if (!dbEntry) {
      throw new NotFoundException(`Database with ID ${databaseId} not found.`);
    }

    try {
      const result = await this.executeSqlScript(sqlContent);

      return {
        success: result.success,
        message: result.message,
        warnings: result.warnings,
      };
    } catch (error) {
      this.logger.error(
        `Error in validateAndExecuteSql for database ${databaseId}:`,
        error,
      );
      const errorMsg = this.errorService.handlePostgresError(
        error as PostgreSQLError,
      );
      throw new BadRequestException(`Failed to execute SQL: ${errorMsg}`);
    }
  }

  /**
   * Reset the student's database container by creating a brand new one
   */
  async resetStudentContainer(
    databaseId: number,
    studentId: number,
  ): Promise<{ message: string }> {
    const dbEntry = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });
    if (!dbEntry) {
      throw new NotFoundException(`Database with ID ${databaseId} not found.`);
    }

    try {
      // Clean up the existing container for this student and database
      await this.containerService.cleanupContainer(studentId, databaseId);

      // Create a fresh temporary container
      await this.containerService.createTemporaryContainer(
        studentId,
        databaseId,
      );

      this.logger.log(
        `Successfully reset database container for student ${studentId}, database ${databaseId}`,
      );

      return {
        message: 'Datenbank-Container wurde erfolgreich zurückgesetzt',
      };
    } catch (error) {
      this.logger.error('Error resetting student container:', error);
      throw this.errorService.createBadRequestException(
        `Fehler beim Zurücksetzen des Datenbank-Containers: ${
          hasErrorMessage(error) ? error.message : 'Unbekannter Fehler'
        }`,
      );
    }
  }

  /**
   * Initialize a student's database container when they start an exercise
   */
  async initializeStudentContainer(
    databaseId: number,
    studentId: number,
  ): Promise<void> {
    const dbEntry = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });
    if (!dbEntry) {
      throw new NotFoundException(`Database with ID ${databaseId} not found.`);
    }

    try {
      // Create a temporary container for this student and database
      await this.containerService.createTemporaryContainer(
        studentId,
        databaseId,
      );

      this.logger.log(
        `Successfully initialized database container for student ${studentId}, database ${databaseId}`,
      );
    } catch (error) {
      this.logger.error('Error initializing student container:', error);
      throw this.errorService.createBadRequestException(
        `Fehler beim Initialisieren des Datenbank-Containers: ${
          hasErrorMessage(error) ? error.message : 'Unbekannter Fehler'
        }`,
      );
    }
  }
}
