import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface DatabaseQueryResult {
  name: string;
  id: number;
  schema: string;
}

@Injectable()
export class DatabaseTableManagerService {
  private readonly logger = new Logger(DatabaseTableManagerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Extracts table names from a SQL schema
   * Identifies tables in both CREATE TABLE and INSERT INTO statements
   */
  extractTableNames(schema: string): string[] {
    if (!schema) return [];

    const tableNames: string[] = [];

    // Regex to match CREATE TABLE statements - including different formats
    const createTableRegex =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([^\s(;"]+))/gi;

    // Also look for tables in INSERT statements
    const insertTableRegex = /INSERT\s+INTO\s+(?:"([^"]+)"|([^\s(;"]+))/gi;

    // Process CREATE TABLE statements
    let match: RegExpExecArray | null;
    while ((match = createTableRegex.exec(schema)) !== null) {
      // The table name will be in capture group 1 (with quotes) or 2 (without quotes)
      const tableName = match[1] || match[2];
      if (tableName && !tableName.startsWith('pg_') && tableName !== 'public') {
        tableNames.push(tableName);
      }
    }

    // Process INSERT INTO statements to catch tables that might only appear in inserts
    while ((match = insertTableRegex.exec(schema)) !== null) {
      // The table name will be in capture group 1 (with quotes) or 2 (without quotes)
      const tableName = match[1] || match[2];
      if (
        tableName &&
        !tableName.startsWith('pg_') &&
        tableName !== 'public' &&
        !tableNames.includes(tableName)
      ) {
        tableNames.push(tableName);
      }
    }

    return tableNames;
  }

  /**
   * Drops database tables associated with a specific database schema
   */
  async dropDatabaseTables(database: DatabaseQueryResult): Promise<string[]> {
    try {
      this.logger.log(
        `Attempting to drop tables for database: ${database.name} (ID: ${database.id})`,
      );

      // Extract table names only from this database's schema
      const tableNames = this.extractTableNames(database.schema);
      this.logger.log(`Tables found in schema: ${tableNames.join(', ') || 'none'}`);

      // Add known tables based on the database name if not already detected
      if (
        database.name.toLowerCase().includes('personen') &&
        !tableNames.includes('personen')
      ) {
        tableNames.push('personen');
      }

      if (tableNames.length === 0) {
        this.logger.debug('No tables found to drop');
        return [];
      }

      this.logger.log(`Attempting to drop tables: ${tableNames.join(', ')}`);

      const droppedTables: string[] = [];

      // Drop each table with CASCADE to handle dependencies
      for (const tableName of tableNames) {
        try {
          // Skip system tables
          if (
            [
              '_prisma_migrations',
              'User',
              'Exercise',
              'Submission',
              'Database',
            ].includes(tableName)
          ) {
            this.logger.debug(`Skipping application table: ${tableName}`);
            continue;
          }

          const dropQuery = `DROP TABLE IF EXISTS "${tableName}" CASCADE;`;
          await this.prisma.$executeRawUnsafe(dropQuery);
          this.logger.log(`Successfully dropped table: ${tableName}`);
          droppedTables.push(tableName);
        } catch (err) {
          this.logger.error(`Error dropping table ${tableName}:`, err);
          // Continue with other tables even if one fails
        }
      }

      // Try to drop any tables derived from database name
      try {
        this.logger.log('Attempting name-based table cleanup');
        const nameWords = database.name.split(/[_\s.]/);
        for (const word of nameWords) {
          if (
            word.length > 3 &&
            !['postgresql', 'mysql'].includes(word.toLowerCase())
          ) {
            try {
              const wordTableName = word.toLowerCase();
              // Skip if we already dropped this table or it's in the no-drop list
              if (
                droppedTables.includes(wordTableName) ||
                [
                  '_prisma_migrations',
                  'User',
                  'Exercise',
                  'Submission',
                  'Database',
                ].includes(wordTableName)
              ) {
                continue;
              }
              await this.prisma.$executeRawUnsafe(
                `DROP TABLE IF EXISTS "${wordTableName}" CASCADE;`,
              );
              this.logger.log(`Dropped table derived from name: ${wordTableName}`);
              droppedTables.push(wordTableName);
            } catch {
              // Ignore errors here
            }
          }
        }
      } catch (err) {
        this.logger.error('Error in name-based cleanup:', err);
      }

      return droppedTables;
    } catch (error) {
      this.logger.error('Error dropping database tables:', error);
      return [];
    }
  }

  /**
   * Analyzes SQL content to extract and log table information
   */
  analyzeTableStructure(schema: string): Record<string, any> {
    const tableNames = this.extractTableNames(schema);

    // Simple analysis result for now
    return {
      tableCount: tableNames.length,
      tableNames: tableNames,
    };
  }
}
