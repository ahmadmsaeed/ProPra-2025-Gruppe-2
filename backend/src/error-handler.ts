import {
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

interface DatabaseError {
  code?: string;
  message: string;
  detail?: string;
  name?: string;
}

/**
 * Generic error handler for database operations
 * @param error The caught exception
 * @param operation The operation being performed (for error message)
 * @param path The API endpoint path (optional)
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  path?: string,
): never {
  // Add timestamp for better debugging
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Database error during ${operation}:`, error);

  const errorResponse: ErrorResponse = {
    message: `An error occurred during ${operation}.`,
    error: 'Database Error',
    detail: (error as DatabaseError)?.message || 'Unknown error',
    timestamp,
    path,
  };

  // Check if it's a PostgreSQL error
  const dbError = error as DatabaseError;
  if (dbError.code) {
    errorResponse.code = dbError.code;

    switch (dbError.code) {
      // Unique constraint violations
      case '23505': // unique_violation
        errorResponse.message = 'A duplicate entry was found.';
        errorResponse.error = 'Duplicate Entry';
        errorResponse.detail = dbError.detail || dbError.message;
        throw new ConflictException(errorResponse);

      // Foreign key violations
      case '23503': // foreign_key_violation
        errorResponse.message = 'Reference integrity constraint violated.';
        errorResponse.error = 'Constraint Violation';
        errorResponse.detail = dbError.detail || dbError.message;
        throw new BadRequestException(errorResponse);

      // Table not found errors
      case '42P01': // undefined_table
        errorResponse.message = 'The requested table does not exist.';
        errorResponse.error = 'Not Found';
        errorResponse.detail = dbError.message;
        throw new NotFoundException(errorResponse);

      // Duplicate table errors
      case '42P07': // duplicate_table
        errorResponse.message = 'The table already exists.';
        errorResponse.error = 'Duplicate Table';
        errorResponse.detail = dbError.detail || dbError.message;
        throw new ConflictException(errorResponse);

      // Permission errors
      case '42501': // insufficient_privilege
        errorResponse.message =
          'You do not have permission to perform this operation.';
        errorResponse.error = 'Permission Denied';
        errorResponse.detail = dbError.message;
        throw new ForbiddenException(errorResponse);

      // Invalid parameter errors
      case '22P02': // invalid_text_representation
      case '22003': // numeric_value_out_of_range
        errorResponse.message = 'Invalid parameter value.';
        errorResponse.error = 'Invalid Parameter';
        errorResponse.detail = dbError.message;
        throw new BadRequestException(errorResponse);

      default:
        // Handle other database errors
        throw new InternalServerErrorException(errorResponse);
    }
  }

  // Check if it's a Prisma error
  const prismaError = error as {
    name?: string;
    message?: string;
    code?: string;
  };
  if (prismaError.name && prismaError.name.startsWith('Prisma')) {
    switch (prismaError.name) {
      case 'PrismaClientValidationError':
        errorResponse.message = 'Invalid data format.';
        errorResponse.error = 'Validation Error';
        errorResponse.detail = prismaError.message;
        throw new BadRequestException(errorResponse);

      case 'PrismaClientKnownRequestError':
        errorResponse.message = 'Database request failed.';
        errorResponse.error = 'Database Request Error';
        errorResponse.detail = prismaError.message;
        errorResponse.code = prismaError.code;
        throw new BadRequestException(errorResponse);

      case 'PrismaClientUnknownRequestError':
        errorResponse.message = 'An unknown database request error occurred.';
        errorResponse.error = 'Unknown Database Error';
        errorResponse.detail = prismaError.message;
        throw new InternalServerErrorException(errorResponse);

      case 'PrismaClientRustPanicError':
        errorResponse.message = 'A critical database error occurred.';
        errorResponse.error = 'Critical Database Error';
        errorResponse.detail = prismaError.message;
        throw new InternalServerErrorException(errorResponse);

      default:
        errorResponse.message = 'A Prisma error occurred.';
        errorResponse.error = 'Prisma Error';
        errorResponse.detail = prismaError.message;
        throw new InternalServerErrorException(errorResponse);
    }
  }

  // Handle general JavaScript errors
  const jsError = error as Error;
  if (jsError instanceof Error) {
    errorResponse.detail = jsError.message;
    throw new InternalServerErrorException(errorResponse);
  }

  // For unknown error types
  errorResponse.detail = String(error);
  throw new InternalServerErrorException(errorResponse);
}

/**
 * Handle validation errors specifically
 */
export function handleValidationError(error: unknown, field?: string): never {
  const errorResponse: ErrorResponse = {
    message: `Validation failed${field ? ` for field: ${field}` : ''}.`,
    error: 'Validation Error',
    timestamp: new Date().toISOString(),
  };

  const jsError = error as Error;
  if (jsError instanceof Error) {
    errorResponse.detail = jsError.message;
  } else {
    errorResponse.detail = String(error);
  }

  throw new BadRequestException(errorResponse);
}

/**
 * Handle authentication/authorization errors
 */
export function handleAuthError(error: unknown, operation: string): never {
  const errorResponse: ErrorResponse = {
    message: `Authentication failed for ${operation}.`,
    error: 'Authentication Error',
    timestamp: new Date().toISOString(),
  };

  const jsError = error as Error;
  if (jsError instanceof Error) {
    errorResponse.detail = jsError.message;
  } else {
    errorResponse.detail = String(error);
  }

  throw new ForbiddenException(errorResponse);
}

/**
 * Handle file operation errors
 */
export function handleFileError(
  error: unknown,
  operation: string,
  filename?: string,
): never {
  const errorResponse: ErrorResponse = {
    message: `File operation failed: ${operation}${filename ? ` for ${filename}` : ''}.`,
    error: 'File Error',
    timestamp: new Date().toISOString(),
  };

  const jsError = error as Error;
  if (jsError instanceof Error) {
    errorResponse.detail = jsError.message;
  } else {
    errorResponse.detail = String(error);
  }

  throw new InternalServerErrorException(errorResponse);
}

/**
 * Handle SQL execution errors
 */
export function handleSqlError(error: unknown, query?: string): never {
  const errorResponse: ErrorResponse = {
    message: 'SQL execution failed.',
    error: 'SQL Error',
    timestamp: new Date().toISOString(),
  };

  const jsError = error as Error;
  if (jsError instanceof Error) {
    errorResponse.detail = jsError.message;
  } else {
    errorResponse.detail = String(error);
  }

  // Don't include the full query for security reasons, just mention that SQL failed
  if (query) {
    errorResponse.detail += ' [Query execution failed]';
  }

  throw new BadRequestException(errorResponse);
}
