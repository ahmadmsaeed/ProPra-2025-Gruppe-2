/**
 * Helper functions to bootstrap the application with error handling
 */
import { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

/**
 * Set up global exception filters for the application
 */
export function setupErrorHandling(app: INestApplication): void {
  // Apply the HTTP exception filter globally
  app.useGlobalFilters(new HttpExceptionFilter());

  // Log that error handling is set up
  console.log('Global error handling configured');
}

/**
 * Set up all global middleware and pipes
 */
export function setupGlobalMiddleware(app: INestApplication): void {
  // Apply error handling
  setupErrorHandling(app);

  // Log setup completion
  console.log('Global middleware configured');
}
