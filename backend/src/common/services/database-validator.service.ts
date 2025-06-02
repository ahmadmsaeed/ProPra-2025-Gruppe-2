import { Injectable } from '@nestjs/common';

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class DatabaseValidatorService {
  /**
   * Validates SQL schema for potential issues
   */
  validateSchema(schema: string): ValidationResult {
    if (!schema || !schema.trim()) {
      return { valid: false, reason: 'Empty schema provided' };
    }

    // Check for dangerous operations
    if (this.containsDangerousOperations(schema)) {
      return {
        valid: false,
        reason: 'Schema contains potentially dangerous operations',
      };
    }

    return { valid: true };
  }

  /**
   * Checks if SQL contains system-affecting operations
   */
  private containsDangerousOperations(sql: string): boolean {
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA\s+public/i,
      /DROP\s+(?:TABLE|VIEW|SEQUENCE|FUNCTION)\s+(?!IF\s+EXISTS)/i,
      /ALTER\s+USER/i,
      /GRANT\s+ALL/i,
      /CREATE\s+USER/i,
      /DROP\s+USER/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(sql));
  }

  /**
   * Validates table names for potential issues
   */
  validateTableNames(tableNames: string[]): ValidationResult {
    if (!tableNames || tableNames.length === 0) {
      return { valid: true }; // No tables is valid
    }

    // Check for system table conflicts
    const systemTables = [
      '_prisma_migrations',
      'User',
      'Exercise',
      'Submission',
      'Database',
    ];
    const conflictingTables = tableNames.filter(
      (name) => systemTables.includes(name) || name.startsWith('pg_'),
    );

    if (conflictingTables.length > 0) {
      return {
        valid: false,
        reason: `Tables conflict with system tables: ${conflictingTables.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates an SQL query for execution safety
   */
  validateQuery(query: string): ValidationResult {
    if (!query || !query.trim()) {
      return { valid: false, reason: 'Empty query provided' };
    }

    // Check for non-SELECT operations in user queries
    if (
      !/^\s*SELECT/i.test(query) &&
      !/^\s*WITH/i.test(query) &&
      !/^\s*EXPLAIN/i.test(query)
    ) {
      // Also allow SHOW commands
      if (!/^\s*SHOW/i.test(query)) {
        return {
          valid: false,
          reason:
            'Only SELECT, WITH, EXPLAIN, and SHOW queries are allowed for direct execution',
        };
      }
    }

    // Check for dangerous operations
    if (this.containsDangerousOperations(query)) {
      return {
        valid: false,
        reason: 'Query contains potentially dangerous operations',
      };
    }

    return { valid: true };
  }

  /**
   * Validates SQL file content against database constraints and security rules
   */
  validateSqlFileContent(sqlContent: string): ValidationResult {
    if (!sqlContent || !sqlContent.trim()) {
      return { valid: false, reason: 'Empty SQL content provided' };
    }

    // Check for dangerous operations that could affect system integrity
    if (this.containsDangerousOperations(sqlContent)) {
      return {
        valid: false,
        reason: 'SQL contains potentially dangerous operations',
      };
    }

    // Check for extremely large SQL files
    if (sqlContent.length > 10 * 1024 * 1024) {
      // 10MB limit
      return {
        valid: false,
        reason: 'SQL file is too large (exceeds 10MB)',
      };
    }

    return { valid: true };
  }
}
