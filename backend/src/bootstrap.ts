import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import helmet from 'helmet';
import { join } from 'path';
import { PrismaService } from './prisma/prisma.service';

/**
 * Bootstrap function that initializes the NestJS application
 * with proper middleware, pipes, and exception filters
 */
export async function bootstrap() {
  try {
    // Create NestJS application
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Configure CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true,
    });

    // Security enhancements
    app.use(helmet());

    // Performance optimizations
    app.use(compression());

    // Configure Express middleware with increased limits
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(express.json({ limit: '50mb' }));

    // Configure static assets
    app.use('/public', express.static('public'));
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });

    // Set up validation pipe with enhanced options
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // Register global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Enable Prisma shutdown hooks with graceful app termination
    const prismaService = app.get(PrismaService);
    await prismaService.enableShutdownHooks(app);

    // Start the server on specified port
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);

    return app;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
