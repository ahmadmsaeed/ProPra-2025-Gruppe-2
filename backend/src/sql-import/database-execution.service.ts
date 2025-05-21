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

    // Default batch size to 10 if not specified
    const batchSize = options.batchSize || 10;
    // Default to using transactions
    const useTransaction = options.useTransaction !== false;

    // Filter out empty statements
    const validStatements = statements.filter(stmt => stmt.trim().length > 0);
    
    console.log(`Executing ${validStatements.length} SQL statements ${useTransaction ? 'in transaction' : 'without transaction'}`);
    
    // First, categorize statements
    const createTableStatements = validStatements.filter(stmt => 
      stmt.trim().toUpperCase().startsWith('CREATE TABLE'));
    
    const insertStatements = validStatements.filter(stmt => 
      stmt.trim().toUpperCase().startsWith('INSERT INTO'));
    
    const otherStatements = validStatements.filter(stmt => 
      !stmt.trim().toUpperCase().startsWith('CREATE TABLE') && 
      !stmt.trim().toUpperCase().startsWith('INSERT INTO'));
    
    console.log(`Statement breakdown: ${createTableStatements.length} CREATE TABLE, ` +
                `${otherStatements.length} other DDL, ${insertStatements.length} INSERT INTO`);
    
    // First execute all CREATE TABLE statements
    for (const statement of createTableStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        console.log(`Handling CREATE TABLE error: ${err.code || 'unknown'}`);
        // Non-critical errors like table already exists should not prevent further execution
      }
    }
    
    // Then execute all other DDL statements
    for (const statement of otherStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        console.log(`Handling DDL error: ${err.code || 'unknown'}`);
      }
    }
    
    // Finally execute all INSERT statements
    for (const statement of insertStatements) {
      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (err) {
        this.handleStatementError(statement, err, errors, warnings);
        console.log(`Handling INSERT error: ${err.code || 'unknown'}`);
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
    const errorMsg = this.errorService.handlePostgresError(err);

    // Add statement info to error message for better debugging
    const statementInfo = statement.substring(0, 50) + (statement.length > 50 ? '...' : '');
    const enhancedMessage = `[${statementInfo}] ${errorMsg}`;

    // Determine if this is a critical error or just a warning
    if (this.errorService.isNonCriticalError(err)) {
      console.warn(`Non-critical error in statement: ${enhancedMessage}`, err.code);
      warnings.push(enhancedMessage);
    } else {
      console.error(`Critical error in statement: ${enhancedMessage}`, err.code);
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
    console.log(`SQL split into ${statements.length} statements`);
    
    // Log a sample of statements for debugging
    if (statements.length > 0) {
      console.log('First statement preview:', 
                  statements[0].substring(0, 100));
      if (statements.length > 1) {
        console.log('Second statement preview:', 
                   statements[1].substring(0, 100));
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
      useTransaction: options.useTransaction ?? false
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
      console.error(`Error in validateAndExecuteSql for database ${databaseId}:`, error);
      const errorMsg = this.errorService.handlePostgresError(error);
      throw new BadRequestException(`Failed to execute SQL: ${errorMsg}`);
    }
  }
}