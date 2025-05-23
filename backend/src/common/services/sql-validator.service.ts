import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface PgColumn {
  column_name: string;
}

interface ExistsResult {
  exists: boolean;
}

@Injectable()
export class SqlValidatorService {
  constructor(private prisma: PrismaService) {}

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
   * Validates SQL safety and data integrity
   */
  validateSqlSafety(query: string): { valid: boolean; reason?: string } {
    // Check for dangerous operations
    const dangerousOperations = [
      'DROP DATABASE',
      'DROP SCHEMA',
      'TRUNCATE DATABASE',
      'CREATE DATABASE',
      'ALTER DATABASE',
      'DELETE FROM',
      'UPDATE ',
    ];

    const upperQuery = query.toUpperCase();
    for (const op of dangerousOperations) {
      if (upperQuery.includes(op)) {
        return {
          valid: false,
          reason: `Nicht erlaubte Operation: ${op}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validates SQL statements before execution
   */
  validateSqlStatements(
    sqlContent: string,
    statements: string[],
  ): Array<{ valid: boolean; reason?: string }> {
    return statements.map((stmt) => this.validateSqlSafety(stmt));
  }

  /**
   * Validates SQL file content for safety and data integrity
   */
  async validateSqlFileContent(
    sqlContent: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // First check basic SQL safety
    const safetyCheck = this.validateSqlSafety(sqlContent);
    if (!safetyCheck.valid) {
      return safetyCheck;
    }

    try {
      // Extract INSERT statements and their target tables
      const insertMatches = sqlContent.matchAll(
        /INSERT\s+INTO\s+(\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/gi,
      );
      const inserts = Array.from(insertMatches);

      // Track tables and their primary keys to check
      const tablePrimaryKeys = new Map<string, Set<string>>();

      for (const insert of inserts) {
        const tableName = insert[1];
        const columns = insert[2].split(',').map((col) => col.trim());
        const values = insert[3].split(',').map((val) => val.trim());

        // Check if this table already exists
        const tableExistsQuery = Prisma.sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${tableName}
          );
        `;
        const tableCheck =
          await this.prisma.$queryRaw<ExistsResult[]>(tableExistsQuery);

        if (tableCheck[0]?.exists) {
          // Get primary key columns for the table
          const pkQuery = Prisma.sql`
            SELECT a.attname as column_name
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid
              AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = ${tableName}::regclass
              AND i.indisprimary;
          `;
          const pkColumns = await this.prisma.$queryRaw<PgColumn[]>(pkQuery);

          // If table exists and has primary keys, check for conflicts
          if (pkColumns && pkColumns.length > 0) {
            const pkColumnNames = pkColumns.map((pk) => pk.column_name);
            const pkIndexes = pkColumnNames.map((pkCol) =>
              columns.indexOf(pkCol),
            );

            // Extract primary key values from the INSERT
            const pkValues = pkIndexes.map((idx) => values[idx]);

            // Check if these values already exist
            const placeHolders = pkValues.map((_, i) => `$${i + 1}`).join(', ');
            const existingQuery = Prisma.sql`
              SELECT EXISTS (
                SELECT 1 FROM "${tableName}"
                WHERE (${Prisma.join(pkColumnNames)}) IN ((${Prisma.raw(placeHolders)}))
              );
            `;
            const existingCheck =
              await this.prisma.$queryRaw<ExistsResult[]>(existingQuery);

            if (existingCheck[0]?.exists) {
              return {
                valid: false,
                reason: `Cannot upload SQL file: Would overwrite existing data in table '${tableName}' (Primary key values: ${pkValues.join(', ')})`,
              };
            }

            // Track this combination for future checks
            if (!tablePrimaryKeys.has(tableName)) {
              tablePrimaryKeys.set(tableName, new Set());
            }
            tablePrimaryKeys.get(tableName)!.add(pkValues.join('|'));
          }
        }
      }

      return { valid: true };
    } catch (error: any) {
      console.error('Error validating SQL file content:', error);
      return {
        valid: false,
        reason: `SQL file validation failed: ${error.message}`,
      };
    }
  }
}
