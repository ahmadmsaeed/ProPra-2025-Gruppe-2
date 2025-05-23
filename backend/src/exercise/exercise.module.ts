/**
 * Module for exercise management (CRUD, file upload, etc.).
 */
import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { ExerciseSessionController } from './exercise-session.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SqlImportModule } from '../sql-import/sql-import.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, SqlImportModule, CommonModule],
  controllers: [ExerciseController, ExerciseSessionController],
  providers: [ExerciseService],
  exports: [ExerciseService],
})
export class ExerciseModule {}
