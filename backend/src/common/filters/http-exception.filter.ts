import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// Define constants to avoid enum comparison issues
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorMessage = 'An error occurred';
    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const typedResponse = exceptionResponse as Record<string, unknown>;
      if (typedResponse.message && typeof typedResponse.message === 'string') {
        errorMessage = typedResponse.message;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: this.getErrorType(status),
      message: errorMessage,
    };

    // Log errors (but not 401/403 which are normal auth flows)
    const shouldLog =
      status === HTTP_STATUS.INTERNAL_SERVER_ERROR ||
      (status >= 400 &&
        status !== HTTP_STATUS.UNAUTHORIZED &&
        status !== HTTP_STATUS.FORBIDDEN);

    if (shouldLog) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception.stack,
      );
    }

    response.status(status).json(errorResponse);
  }
  private getErrorType(status: number): string {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return 'Unauthorized';
      case HTTP_STATUS.FORBIDDEN:
        return 'Forbidden';
      case HTTP_STATUS.NOT_FOUND:
        return 'Not Found';
      case HTTP_STATUS.BAD_REQUEST:
        return 'Bad Request';
      case HTTP_STATUS.CONFLICT:
        return 'Conflict';
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return 'Validation Error';
      default:
        return 'Internal Server Error';
    }
  }
}
