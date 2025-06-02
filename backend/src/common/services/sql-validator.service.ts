import { Injectable } from '@nestjs/common';

/**
 * Service for validating SQL statements before execution
 */
@Injectable()
export class SqlValidatorService {
  // List of potentially harmful SQL patterns
  private readonly BLOCKED_PATTERNS: RegExp[] = [
    /DROP\s+DATABASE/i, // Prevent dropping databases
    /DROP\s+SCHEMA\s+public/i, // Prevent dropping the public schema
    /DROP\s+USER/i, // Prevent dropping users
    /CREATE\s+USER/i, // Prevent creating users
    /ALTER\s+ROLE/i, // Prevent altering roles
    /GRANT\s+ALL/i, // Prevent granting all privileges
    /COPY\s+.*FROM\s+PROGRAM/i, // Prevent executing programs via COPY
    /COPY\s+.*TO\s+PROGRAM/i, // Prevent executing programs via COPY
    /DO\s+.*LANGUAGE/i, // Prevent DO blocks that might execute code
    /pg_read_binary_file/i, // Prevent file system access
    /pg_read_file/i, // Prevent file system access
    /CREATE\s+EXTENSION/i, // Prevent extension creation
    /(?:UPDATE|DELETE|DROP|TRUNCATE)\s+(?:\w+\.)?\w+\s+(?:WHERE\s+)?(?:1\s*=\s*1|TRUE)/i, // Prevent operations without proper WHERE clauses
  ];

  // List of safe statement types for basic imports
  private readonly SAFE_PATTERNS: RegExp[] = [
    /^SELECT\s+/i,
    /^CREATE\s+TABLE/i,
    /^CREATE\s+INDEX/i,
    /^ALTER\s+TABLE/i,
    /^INSERT\s+INTO/i,
    /^UPDATE\s+.+\s+SET\s+.+\s+WHERE\s+/i, // Require WHERE clause
    /^DELETE\s+FROM\s+.+\s+WHERE\s+/i, // Require WHERE clause
  ];

  /**
   * Check if a SQL statement contains potentially harmful operations
   */
  public containsHarmfulOperations(sql: string): boolean {
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(sql)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if SQL is generally safe for execution
   * Returns { valid: true } if valid, { valid: false, reason: string } if invalid
   */
  public validateSqlSafety(sql: string): { valid: boolean; reason?: string } {
    // Clean up SQL - remove comments and normalize whitespace
    const cleanedSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();

    // Check for empty statements
    if (!cleanedSql) {
      return { valid: true };
    }

    // Check against blocked patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(cleanedSql)) {
        return {
          valid: false,
          reason: `SQL contains potentially harmful operations: ${pattern.toString()}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validates that all statements in a SQL string are safe to execute
   * Returns an array of validation results for each statement
   */
  public validateSqlStatements(
    sql: string,
    statements: string[],
  ): Array<{
    statement: string;
    valid: boolean;
    reason?: string;
  }> {
    return statements.map((statement) => {
      const result = this.validateSqlSafety(statement);
      return {
        statement:
          statement.length > 100
            ? statement.substring(0, 97) + '...'
            : statement,
        valid: result.valid,
        reason: result.reason,
      };
    });
  }
}
