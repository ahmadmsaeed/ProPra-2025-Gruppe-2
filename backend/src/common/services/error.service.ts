import { Injectable, BadRequestException } from '@nestjs/common';

interface PostgresError {
  code?: string;
  message?: string;
}

/**
 * Service for handling and formatting specific error types
 */
@Injectable()
export class ErrorService {
  /**
   * Handle PostgreSQL errors with specific error codes
   */
  handlePostgresError(error: PostgresError): string {
    // Check if it's a PostgreSQL error with a code
    if (error?.code && error?.message) {
      // Log full error for debugging
      console.log(
        `Processing PostgreSQL error with code ${error.code}: ${error.message}`,
      );

      switch (error.code) {
        case '42P07': // relation already exists
          return `Tabelle existiert bereits (kann ignoriert werden)`;
        case '23505': {
          // unique violation
          // Include details about which constraint was violated if available
          const constraintMatch = error.message.match(
            /violates unique constraint "([^"]+)"/,
          );
          const constraint = constraintMatch
            ? constraintMatch[1]
            : 'unbekannter Schlüssel';
          return `Datensatz mit diesem Schlüssel (${constraint}) existiert bereits (kann ignoriert werden)`;
        }
        case '42P01': {
          // relation does not exist
          // Try to extract the table name from the error message
          const tableNameMatch = error.message.match(
            /relation "([^"]+)" does not exist/,
          );
          const tableName = tableNameMatch ? tableNameMatch[1] : 'unbekannt';
          return `Die Tabelle "${tableName}" existiert nicht. Überprüfen Sie den Tabellennamen oder erstellen Sie die Tabelle zuerst.`;
        }
        case '42703': {
          // column does not exist
          // Try to extract the column name from the error message
          const columnMatch = error.message.match(
            /column "([^"]+)" does not exist/,
          );
          const columnName = columnMatch ? columnMatch[1] : 'unbekannt';
          return `Die Spalte "${columnName}" existiert nicht: ${error.message}`;
        }
        case '23503': {
          // foreign key violation
          return `Referenzfehler: ${error.message}`;
        }
        default:
          return `Datenbankfehler (${error.code}): ${error.message}`;
      }
    }

    // If it's not a PostgreSQL error or has no code, return the original message
    return error?.message || 'Unbekannter Fehler';
  }

  /**
   * Determines if an error is a non-critical error that should be treated as a warning
   * and allow continued execution
   */
  isNonCriticalError(error: PostgresError): boolean {
    if (error?.code) {
      // These error codes are considered non-critical:
      // 42P07: relation already exists
      // 23505: unique violation (duplicate key)
      // P2010: Prisma raw query error that's usually non-critical
      // 42P01: relation does not exist (in some contexts)
      console.log(
        `Checking if error code ${error.code} is non-critical. Message: ${error.message || 'No message'}`,
      );
      return ['42P07', '23505', 'P2010', '42P01'].includes(error.code);
    }
    return false;
  }

  /**
   * Create a BadRequestException with a specific error message
   */
  createBadRequestException(message: string): BadRequestException {
    return new BadRequestException(message);
  }
}
