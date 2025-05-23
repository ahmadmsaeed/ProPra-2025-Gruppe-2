// src/prisma/prisma.service.ts

/**
 * PrismaService extends PrismaClient for use with NestJS DI and lifecycle hooks.
 * Provides methods for database connection management and performance optimization.
 */
import {
  INestApplication,
  Injectable,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      // Configure connection pooling through the DATABASE_URL
      // which can include connection pool parameters
    });

    // Log queries in development environment
    if (process.env.NODE_ENV !== 'production') {
      this.setupQueryLogging();
    }
  }

  /**
   * Called when the module is initialized
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Enables graceful shutdown hooks for Prisma Client and NestJS app
   * Updated for compatibility with Prisma 5.0.0+
   */
  async enableShutdownHooks(app: INestApplication) {
    // Use process events instead of Prisma's beforeExit hook (deprecated in Prisma 5.0.0+)
    process.on('beforeExit', async () => {
      this.logger.log(
        'Process beforeExit event triggered - closing database connections',
      );
      await app.close();
    });

    // Additional handlers for other termination signals
    ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((signal) => {
      process.once(signal, async () => {
        this.logger.log(
          `${signal} signal received - closing database connections`,
        );
        await this.$disconnect();
        await app.close();
        process.exit(0);
      });
    });
  }

  /**
   * Setup query logging for debugging purposes
   */
  private setupQueryLogging() {
    // @ts-ignore - Prisma extension type issue
    this.$on('query', (event: any) => {
      if (event.query && event.duration !== undefined) {
        // Only log slow queries (more than 100ms) to reduce noise
        if (event.duration > 100) {
          this.logger.debug(`SLOW QUERY (${event.duration}ms): ${event.query}`);
        }
      }
    });

    // @ts-ignore - Prisma extension type issue
    this.$on('error', (event: any) => {
      this.logger.error(`Database error: ${event.message}`, event.target);
    });
  }

  /**
   * Execute a query with transaction retry logic
   * Useful for handling connection errors or deadlocks
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 50,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Only retry on connection errors or deadlocks
        const shouldRetry = this.isTransientError(error);
        if (!shouldRetry) {
          throw error;
        }

        this.logger.warn(
          `Database operation failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`,
          error,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Increase delay for next attempt (exponential backoff)
        delay *= 2;
      }
    }

    this.logger.error(
      `Database operation failed after ${retries} attempts`,
      lastError,
    );
    throw lastError;
  }

  /**
   * Check if an error is a transient error that can be retried
   */
  private isTransientError(error: any): boolean {
    const transientErrors = [
      'connection',
      'deadlock',
      'lock',
      'timeout',
      'disconnect',
      'socket',
      'ECONNRESET',
    ];

    if (!error) return false;

    const errorString = error.toString().toLowerCase();
    return transientErrors.some((type) => errorString.includes(type));
  }
}
