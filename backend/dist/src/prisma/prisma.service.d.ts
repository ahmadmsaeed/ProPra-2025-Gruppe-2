import { INestApplication, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    enableShutdownHooks(app: INestApplication): void;
    private setupQueryLogging;
    executeWithRetry<T>(operation: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
    private isTransientError;
}
