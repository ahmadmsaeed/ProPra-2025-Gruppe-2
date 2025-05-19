// src/prisma/prisma.service.ts

/**
 * PrismaService extends PrismaClient for use with NestJS DI and lifecycle hooks.
 * Provides a method to enable graceful shutdown of the Prisma client with the NestJS app.
 */
import { INestApplication, Injectable } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  /**
   * Enables Prisma shutdown hooks for graceful app termination.
   */
  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}