/**
 * Module for managing student exercise submissions
 */
import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SqlImportModule } from '../sql-import/sql-import.module';
import { ExerciseModule } from '../exercise/exercise.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, SqlImportModule, ExerciseModule, CommonModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
