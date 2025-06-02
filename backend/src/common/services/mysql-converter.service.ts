import { Injectable } from '@nestjs/common';
import { SqlProcessorService } from './sql-processor.service';

/**
 * Service for converting MySQL dumps to PostgreSQL compatible format
 */
@Injectable()
export class MySqlConverterService {
  constructor(private sqlProcessor: SqlProcessorService) {}

  /**
   * Convert MySQL SQL to PostgreSQL compatible SQL
   */
  public convertToPostgreSQL(sqlContent: string): string {
    // Split content into statements first
    const statements = this.sqlProcessor.splitIntoStatements(sqlContent);
    const convertedStatements: string[] = [];

    for (const statement of statements) {
      // Skip empty statements
      if (!statement.trim()) {
        continue;
      }

      let convertedStatement = statement;

      // Remove MySQL-specific comments from this statement
      convertedStatement = convertedStatement.replace(/--.*$/gm, '');
      convertedStatement = convertedStatement.replace(/\/\*.*?\*\//gs, '');

      // Skip pure MySQL control statements
      if (
        /^\s*(SET|USE|LOCK TABLES|UNLOCK TABLES|CREATE DATABASE|DROP DATABASE)/i.test(
          convertedStatement,
        )
      ) {
        continue;
      }

      // Convert CREATE TABLE statements
      if (/^\s*CREATE TABLE/i.test(convertedStatement)) {
        convertedStatement =
          this.convertCreateTableStatement(convertedStatement);
        convertedStatements.push(convertedStatement);
      }
      // Convert INSERT statements
      else if (/^\s*INSERT INTO/i.test(convertedStatement)) {
        convertedStatement = this.convertInsertStatement(convertedStatement);
        convertedStatements.push(convertedStatement);
      } else {
        // For other statements, just convert backticks to double quotes
        convertedStatement = convertedStatement.replace(/`([^`]*)`/g, '"$1"');
        convertedStatements.push(convertedStatement);
      }
    }

    // Join all converted statements
    let result = convertedStatements.join('\n\n');

    // Post-processing: add sequences for SERIAL columns
    result = this.addSequencesForSerialColumns(result);

    return result;
  }

  /**
   * Convert a MySQL CREATE TABLE statement to PostgreSQL
   */
  private convertCreateTableStatement(statement: string): string {
    let converted = statement;

    // Keep IF NOT EXISTS but transform it to work with PostgreSQL
    converted = converted.replace(
      /CREATE TABLE IF NOT EXISTS `([^`]+)`/g,
      'CREATE TABLE IF NOT EXISTS "$1"',
    );
    converted = converted.replace(
      /CREATE TABLE `([^`]+)`/g,
      'CREATE TABLE "$1"',
    );

    // Convert MySQL syntax to PostgreSQL
    converted = converted.replace(/ENGINE=\w+/g, '');
    converted = converted.replace(/DEFAULT CHARSET=\w+/g, '');
    converted = converted.replace(/\s+COLLATE=\w+/g, '');
    converted = converted.replace(/AUTO_INCREMENT=\d+/g, '');

    // Handle AUTO_INCREMENT properly by replacing with SERIAL type
    converted = converted.replace(
      /int\(\d+\)\s+NOT\s+NULL\s+AUTO_INCREMENT/gi,
      'SERIAL',
    );
    converted = converted.replace(
      /integer\s+NOT\s+NULL\s+AUTO_INCREMENT/gi,
      'SERIAL',
    );
    converted = converted.replace(/int\(\d+\)\s+AUTO_INCREMENT/gi, 'SERIAL');
    converted = converted.replace(/AUTO_INCREMENT/gi, ''); // Remove any remaining AUTO_INCREMENT

    // Convert backticks to double quotes
    converted = converted.replace(/`([^`]*)`/g, '"$1"');

    // Convert data types
    converted = this.convertDataTypes(converted);

    // Remove other MySQL-specific syntax
    converted = converted.replace(/COLLATE.*?(?=[\s,);])/g, '');
    converted = converted.replace(/CHARACTER SET.*?(?=[\s,);])/g, '');
    converted = converted.replace(/\s+DEFAULT\s+CHAR(?:SET)?[^,);]*/gi, '');

    return converted;
  }

  /**
   * Convert MySQL data types to PostgreSQL
   */
  private convertDataTypes(statement: string): string {
    let converted = statement;

    converted = converted.replace(/tinyint\(1\)/g, 'boolean'); // MySQL boolean type
    converted = converted.replace(/int\(\d+\)/g, 'integer');
    converted = converted.replace(/varchar\(\d+\)/g, 'varchar');
    converted = converted.replace(/tinyint\(\d+\)/g, 'smallint');
    converted = converted.replace(/tinyinteger/g, 'smallint'); // Fix incorrect type conversion
    converted = converted.replace(/blob/gi, 'bytea'); // BLOB to bytea
    converted = converted.replace(/text(\(\d+\))?/g, 'text'); // text with or without length to text

    return converted;
  }

  /**
   * Convert MySQL INSERT statements to PostgreSQL compatible format
   */
  private convertInsertStatement(statement: string): string {
    let converted = statement;

    // Convert backticks to double quotes
    converted = converted.replace(/`([^`]*)`/g, '"$1"');

    // Format multi-row inserts for PostgreSQL
    if (/VALUES\s*\([^)]+\)\s*,\s*\(/i.test(converted)) {
      // Extract table name and columns
      const tableMatch = converted.match(
        /INSERT INTO\s+(?:"([^"]+)"|([^\s(]+))\s*\(([^)]+)\)/i,
      );
      if (tableMatch) {
        const tableName = tableMatch[1] || tableMatch[2];
        const columns = tableMatch[3];

        // Extract all value groups
        const valuesMatch = converted.match(
          /VALUES\s*((?:\([^)]+\)(?:\s*,\s*\([^)]+\))*)\s*)/i,
        );
        if (valuesMatch) {
          const valuesStr = valuesMatch[1];
          converted = `INSERT INTO "${tableName}" (${columns}) VALUES ${valuesStr};`;
        }
      }
    }

    return converted;
  }

  /**
   * Add sequences for serial columns in PostgreSQL
   */
  private addSequencesForSerialColumns(sql: string): string {
    // Extract CREATE TABLE statements
    const tableMatches = sql.match(/CREATE TABLE[^;]+?;/gs);
    const sequences: string[] = [];

    if (!tableMatches) {
      return sql;
    }

    for (const tableMatch of tableMatches) {
      // Extract table name
      const tableNameMatch = tableMatch.match(
        /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/,
      );
      if (!tableNameMatch) {
        continue;
      }

      const tableName = tableNameMatch[1];

      // Check if this table has a SERIAL column (converted from AUTO_INCREMENT)
      if (tableMatch.includes('SERIAL')) {
        // Find the column name that was SERIAL
        const serialColumnMatch = tableMatch.match(/"([^"]+)"\s+SERIAL/);
        if (!serialColumnMatch) {
          continue;
        }

        const columnName = serialColumnMatch[1];

        // Add sequence for the primary key
        // Extract the last value for the sequence from INSERT statements
        const insertMatches = sql.match(
          new RegExp(
            `INSERT INTO "${tableName}"[^;]+VALUES\\s*\\([^;]+\\);`,
            'g',
          ),
        );
        let maxId = 1;

        if (insertMatches) {
          maxId = this.findMaxIdFromInserts(insertMatches, columnName);
        }

        // Add sequence definition
        sequences.push(`\n-- Sequence for ${tableName}.${columnName}`);
        sequences.push(
          `CREATE SEQUENCE IF NOT EXISTS "${tableName}_${columnName}_seq" OWNED BY "${tableName}"."${columnName}";`,
        );
        sequences.push(
          `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT nextval('"${tableName}_${columnName}_seq"');`,
        );
        sequences.push(
          `SELECT setval('"${tableName}_${columnName}_seq"', ${maxId + 1}, false);`,
        );
      }
    }

    // Add all sequences at the end
    if (sequences.length > 0) {
      return sql + '\n\n' + sequences.join('\n');
    }

    return sql;
  }

  /**
   * Find maximum ID value from INSERT statements
   */
  private findMaxIdFromInserts(
    insertStatements: string[],
    columnName: string,
  ): number {
    let maxId = 1;

    for (const insert of insertStatements) {
      // Find column position in INSERT statement
      const columnListMatch = insert.match(/INSERT INTO "[^"]+" \(([^)]+)\)/);
      if (!columnListMatch) {
        continue;
      }

      const columns = columnListMatch[1]
        .split(',')
        .map((c) => c.trim().replace(/"/g, ''));
      const columnIndex = columns.indexOf(columnName);

      if (columnIndex === -1) {
        continue;
      }

      // Extract values for this column
      const values = insert.match(/VALUES\s*\(([^;]+)\);/);
      if (!values) {
        continue;
      }

      const valueRows = values[1]
        .split('),(')
        .map((row) => row.replace(/^\(|\)$/g, '').split(','));

      valueRows.forEach((row) => {
        if (row[columnIndex] && parseInt(row[columnIndex]) > maxId) {
          maxId = parseInt(row[columnIndex]);
        }
      });
    }

    return maxId;
  }
}
