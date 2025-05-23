import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Standard error response structure
 */
interface ErrorResponse {
  message: string;
  error: string;
  detail?: string;
  code?: string;
  timestamp?: string;
  path?: string;
}

/**
 * Generic error handler for database operations
 * @param error The caught exception
 * @param operation The operation being performed (for error message)
 * @param path The API endpoint path (optional)
 */
export function handleDatabaseError(
  error: any,
  operation: string,
  path?: string,
): never {
  // Add timestamp for better debugging
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database error during ${operation}:`, error);

  const errorResponse: ErrorResponse = {
    message: `An error occurred during ${operation}.`,
    error: 'Database Error',
    detail: error.message || 'Unknown error',
    timestamp,
    path,
  };

  // Check if it's a PostgreSQL error
  if (error.code) {
    errorResponse.code = error.code;

    switch (error.code) {
      // Unique constraint violations
      case '23505': // unique_violation
        errorResponse.message = 'A duplicate entry was found.';
        errorResponse.error = 'Duplicate Entry';
        errorResponse.detail = error.detail || error.message;
        throw new ConflictException(errorResponse);

      // Foreign key violations
      case '23503': // foreign_key_violation
        errorResponse.message = 'Reference integrity constraint violated.';
        errorResponse.error = 'Constraint Violation';
        errorResponse.detail = error.detail || error.message;
        throw new BadRequestException(errorResponse);

      // Table not found errors
      case '42P01': // undefined_table
        errorResponse.message = 'The requested table does not exist.';
        errorResponse.error = 'Not Found';
        errorResponse.detail = error.message;
        throw new NotFoundException(errorResponse);

      // Duplicate table errors
      case '42P07': // duplicate_table
        errorResponse.message = 'The table already exists.';
        errorResponse.error = 'Duplicate Table';
        errorResponse.detail = error.message;
        throw new ConflictException(errorResponse);

      // Permission errors
      case '42501': // insufficient_privilege
        errorResponse.message =
          'You do not have permission to perform this operation.';
        errorResponse.error = 'Permission Denied';
        errorResponse.detail = error.message;
        throw new ForbiddenException(errorResponse);

      // Invalid parameter errors
      case '22P02': // invalid_text_representation
      case '22003': // numeric_value_out_of_range
        errorResponse.message = 'Invalid parameter value.';
        errorResponse.error = 'Invalid Parameter';
        errorResponse.detail = error.message;
        throw new BadRequestException(errorResponse);

      default:
        // Handle other database errors
        throw new InternalServerErrorException(errorResponse);
    }
  }

  // Check if it's a Prisma error
  if (error.name && error.name.startsWith('Prisma')) {
    switch (error.name) {
      case 'PrismaClientValidationError':
        errorResponse.message = 'Invalid data format.';
        errorResponse.error = 'Validation Error';
        errorResponse.detail = error.message;
        throw new BadRequestException(errorResponse);

      case 'PrismaClientKnownRequestError':
        errorResponse.message = 'Database request failed.';
        errorResponse.error = 'Database Request Error';
        errorResponse.detail = error.message;
        errorResponse.code = error.code;
        throw new BadRequestException(errorResponse);

      case 'PrismaClientUnknownRequestError':
        errorResponse.message = 'An unknown database request error occurred.';
        errorResponse.error = 'Unknown Database Error';
        errorResponse.detail = error.message;
        throw new InternalServerErrorException(errorResponse);

      case 'PrismaClientRustPanicError':
        errorResponse.message = 'A critical database error occurred.';
        errorResponse.error = 'Critical Database Error';
        errorResponse.detail = error.message;
        throw new InternalServerErrorException(errorResponse);

      case 'PrismaClientInitializationError':
        errorResponse.message = 'Failed to initialize database connection.';
        errorResponse.error = 'Database Connection Error';
        errorResponse.detail = error.message;
        throw new InternalServerErrorException(errorResponse);

      default:
        errorResponse.message = 'A database error occurred.';
        errorResponse.error = 'Database Error';
        errorResponse.detail = error.message;
        throw new InternalServerErrorException(errorResponse);
    }
  }

  // For all other errors
  throw new InternalServerErrorException(errorResponse);
}

/**
 * Handles SQL syntax and execution errors
 * @param error The caught SQL exception
 * @param query The SQL query being executed (optional, sanitized for security)
 * @param path The API endpoint path (optional)
 */
export function handleSqlError(
  error: any,
  query?: string,
  path?: string,
): never {
  // Add timestamp for better debugging
  const timestamp = new Date().toISOString();

  // Sanitize query for logging (remove sensitive data)
  const sanitizedQuery = query
    ? query.substring(0, 100) + (query.length > 100 ? '...' : '')
    : 'unavailable';

  console.error(
    `[${timestamp}] SQL execution error with query "${sanitizedQuery}":`,
    error,
  );

  const errorResponse: ErrorResponse = {
    message: 'Error executing the SQL query.',
    error: 'SQL Execution Error',
    detail: error.message || 'Unknown SQL error',
    timestamp,
    path,
  };

  // Handle specific SQL syntax errors
  if (error.message) {
    if (error.message.includes('syntax error')) {
      errorResponse.message = 'SQL syntax error in the provided query.';
      errorResponse.error = 'SQL Syntax Error';
      throw new BadRequestException(errorResponse);
    }

    if (error.message.includes('permission denied')) {
      errorResponse.message =
        'You do not have permission to execute this query.';
      errorResponse.error = 'SQL Permission Error';
      throw new ForbiddenException(errorResponse);
    }

    if (error.message.includes('does not exist')) {
      errorResponse.message = 'The referenced database object does not exist.';
      errorResponse.error = 'SQL Reference Error';
      throw new BadRequestException(errorResponse);
    }

    if (error.message.includes('already exists')) {
      errorResponse.message = 'The database object already exists.';
      errorResponse.error = 'SQL Duplicate Error';
      throw new ConflictException(errorResponse);
    }
  }

  // For all other SQL errors
  throw new BadRequestException(errorResponse);
}
