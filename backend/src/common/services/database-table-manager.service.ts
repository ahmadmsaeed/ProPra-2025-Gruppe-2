import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DatabaseTableManagerService {
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
    let match;
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
  async dropDatabaseTables(database: any): Promise<string[]> {
    try {
      console.log(
        `Attempting to drop tables for database: ${String(database.name)} (ID: ${database.id})`,
      );

      // Extract table names only from this database's schema
      const tableNames = this.extractTableNames(database.schema);
      console.log(`Tables found in schema: ${tableNames.join(', ') || 'none'}`);

      // Add known tables based on the database name if not already detected
      if (
        String(database.name).toLowerCase().includes('personen') &&
        !tableNames.includes('personen')
      ) {
        tableNames.push('personen');
      }

      if (tableNames.length === 0) {
        console.log('No tables found to drop');
        return [];
      }

      console.log(`Attempting to drop tables: ${tableNames.join(', ')}`);

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
            console.log(`Skipping application table: ${tableName}`);
            continue;
          }

          const dropQuery = `DROP TABLE IF EXISTS "${tableName}" CASCADE;`;
          await this.prisma.$executeRawUnsafe(dropQuery);
          console.log(`Successfully dropped table: ${tableName}`);
          droppedTables.push(tableName);
        } catch (err) {
          console.error(`Error dropping table ${tableName}:`, err);
          // Continue with other tables even if one fails
        }
      }

      // Try to drop any tables derived from database name
      try {
        console.log('Attempting name-based table cleanup');
        const nameWords = String(database.name).split(/[_\s.]/);
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
              console.log(`Dropped table derived from name: ${wordTableName}`);
              droppedTables.push(wordTableName);
            } catch (err) {
              // Ignore errors here
            }
          }
        }
      } catch (err) {
        console.error('Error in name-based cleanup:', err);
      }

      return droppedTables;
    } catch (error) {
      console.error('Error dropping database tables:', error);
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
