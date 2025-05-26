import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorService } from '../common/services/error.service';
import { SqlValidatorService } from '../common/services/sql-validator.service';
import { SqlProcessorService } from '../common/services/sql-processor.service';

@Injectable()
export class DatabaseExecutionService {
  constructor(
    private prisma: PrismaService,
    private errorService: ErrorService,
    private sqlValidator: SqlValidatorService,
    private sqlProcessor: SqlProcessorService,
  ) {}

  /**
   * Execute a database query against a specific database
   */
  async executeQuery(databaseId: number, query: string): Promise<any> {
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
      return await this.prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMsg = this.errorService.handlePostgresError(error);

      // Check if this is a "relation does not exist" error and provide a more helpful message
      if (
        error.message &&
        error.message.includes('relation') &&
        error.message.includes('does not exist')
      ) {
        // Extract the table name from the error message if possible
        const tableNameMatch = error.message.match(
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
   * Executes SQL statements with error handling
   */
  private async executeStatements(
    statements: string[],
    options: {
      useTransaction: boolean;
      onError?: (error: any) => 'CONTINUE' | 'THROW';
    },
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    const result = {
      success: true,
      successCount: 0,
      errors: [] as string[],
      warnings: [] as string[],
      message: '',
    };

    if (options.useTransaction) {
      try {
        await this.prisma.$transaction(async (prisma) => {
          for (const statement of statements) {
            try {
              await prisma.$executeRawUnsafe(statement);
              result.successCount++;
            } catch (error) {
              if (options.onError) {
                const action = options.onError(error);
                if (action === 'CONTINUE') {
                  result.warnings.push(error.message);
                  continue;
                }
              }
              throw error;
            }
          }
        });

        result.message =
          result.warnings.length > 0
            ? 'SQL statements executed with warnings'
            : 'All SQL statements executed successfully';
      } catch (error) {
        result.success = false;
        result.errors.push(error.message);
        result.message = `Failed to execute SQL statements: ${error.message}`;
        throw error;
      }
    } else {
      // Non-transactional execution
      for (const statement of statements) {
        try {
          await this.prisma.$executeRawUnsafe(statement);
          result.successCount++;
        } catch (error) {
          if (options.onError) {
            const action = options.onError(error);
            if (action === 'CONTINUE') {
              result.warnings.push(error.message);
              continue;
            }
          }
          result.success = false;
          result.errors.push(error.message);
          result.message = `Failed to execute SQL statement: ${error.message}`;
          throw error;
        }
      }

      if (result.success) {
        result.message =
          result.warnings.length > 0
            ? 'SQL statements executed with warnings'
            : 'All SQL statements executed successfully';
      }
    }

    return result;
  }

  /**
   * Execute SQL statements in batches, with each type of statement in its own transaction
   */
  async executeStatementsOld(
    statements: string[],
    options: { batchSize?: number; useTransaction?: boolean } = {},
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    let successCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const validStatements = statements.filter((stmt) => stmt.trim().length > 0);

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

    console.log(
      `Statement breakdown: ${createTableStatements.length} CREATE TABLE, ` +
        `${otherStatements.length} other DDL, ${insertStatements.length} INSERT INTO`,
    );

    // Execute CREATE TABLE statements first (no transaction needed)
    for (const statement of createTableStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
      }
    }

    // Execute other DDL statements in a transaction
    if (otherStatements.length > 0) {
      try {
        await this.prisma.$transaction(async (prisma) => {
          for (const statement of otherStatements) {
            try {
              await prisma.$executeRawUnsafe(statement);
              successCount++;
              console.log(
                `Successfully executed: ${statement.substring(0, 50)}...`,
              );
            } catch (err) {
              this.handleStatementError(statement, err, errors, warnings);
              if (options.useTransaction) {
                throw err; // Rollback the transaction if useTransaction is true
              }
            }
          }
        });
      } catch (err) {
        console.error('Error in DDL transaction:', err);
        if (!errors.includes(err.message)) {
          errors.push(`DDL transaction failed: ${err.message}`);
        }
      }
    }

    // Execute INSERT statements in a transaction with continue-on-error behavior
    if (insertStatements.length > 0) {
      try {
        await this.prisma.$transaction(async (prisma) => {
          for (const statement of insertStatements) {
            try {
              await prisma.$executeRawUnsafe(statement);
              successCount++;
            } catch (err) {
              this.handleStatementError(statement, err, errors, warnings);
              // Don't throw error for INSERT statements to allow continuing with other inserts
            }
          }
        });
      } catch (err) {
        console.error('Error in INSERT transaction:', err);
        if (!errors.includes(err.message)) {
          errors.push(`INSERT transaction failed: ${err.message}`);
        }
      }
    }

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
    let enhancedMessage = err.message || 'Unknown error';

    // Handle specific PostgreSQL error codes
    if (err.code) {
      switch (err.code) {
        case '23505': // unique_violation
          // If this is an INSERT statement, treat as a warning
          if (statement.trim().toUpperCase().startsWith('INSERT')) {
            const detail = err.detail || 'Duplicate key value';
            warnings.push(`Skipped duplicate data: ${detail}`);
            return; // Don't add to errors array
          }
          enhancedMessage = `Duplicate key violation: ${err.detail || 'Key already exists'}`;
          break;
        case '42P07': // relation_already_exists
          if (statement.trim().toUpperCase().startsWith('CREATE')) {
            warnings.push(`Table already exists, skipping creation`);
            return; // Don't add to errors array
          }
          enhancedMessage = 'Table or relation already exists';
          break;
        case '42P01': // undefined_table
          enhancedMessage = 'Table or relation does not exist';
          break;
        case '42703': // undefined_column
          enhancedMessage = 'Column does not exist';
          break;
        default:
          enhancedMessage = `${err.message} (Code: ${err.code})`;
      }
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
      onError?: (error: any) => 'CONTINUE' | 'THROW';
    } = {},
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    // Extract and validate statements
    const statements = this.sqlProcessor.extractStatements(sqlContent);
    
    // Validate each statement individually
    const validationResults = this.sqlValidator.validateSqlStatements(sqlContent, statements);
    const invalidStatements = validationResults.filter(result => !result.valid);

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

    // Execute statements with provided error handler
    return this.executeStatements(statements, {
      useTransaction: options.useTransaction ?? false,
      onError: options.onError,
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
      console.error(
        `Error in validateAndExecuteSql for database ${databaseId}:`,
        error,
      );
      const errorMsg = this.errorService.handlePostgresError(error);
      throw new BadRequestException(`Failed to execute SQL: ${errorMsg}`);
    }
  }
}
