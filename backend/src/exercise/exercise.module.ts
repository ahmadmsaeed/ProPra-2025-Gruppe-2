/**
 * Module for exercise management (CRUD, file upload, etc.).
 */
import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ExerciseController],
  providers: [ExerciseService, PrismaService],
  exports: [ExerciseService]
})
export class ExerciseModule {} 