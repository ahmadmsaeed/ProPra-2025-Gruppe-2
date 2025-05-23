import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter
 * Provides standardized error responses with details
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the original exception response
    const errorResponse = exception.getResponse();

    // Create a standardized error structure
    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof errorResponse === 'object' && 'message' in errorResponse
          ? errorResponse['message']
          : exception.message,
      error:
        typeof errorResponse === 'object' && 'error' in errorResponse
          ? errorResponse['error']
          : 'Unknown error',
    };

    // Log the error details for server-side tracking
    this.logger.error(
      `HTTP Exception: ${status} - ${errorDetails.message}`,
      `Path: ${request.method} ${request.url}`,
      exception.stack,
    );

    // Send the standardized error response
    response.status(status).json(errorDetails);
  }
}
