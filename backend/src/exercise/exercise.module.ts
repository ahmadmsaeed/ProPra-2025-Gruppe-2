/**
 * Module for exercise management (CRUD, file upload, etc.).
 */
import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { SqlImportModule } from '../sql-import/sql-import.module';

@Module({
  imports: [SqlImportModule],
  controllers: [ExerciseController],
  providers: [ExerciseService],
  exports: [ExerciseService],
})
export class ExerciseModule {}
