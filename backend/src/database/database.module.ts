/**
 * Module for database schema management (CRUD for database schemas).
 */
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseController } from './database.controller';

@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService, PrismaService],
  exports: [DatabaseService]
})
export class DatabaseModule {} 