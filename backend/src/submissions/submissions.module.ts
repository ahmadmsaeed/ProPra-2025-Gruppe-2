/**
 * Module for managing student exercise submissions
 */
import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { CommonModule } from '../common/common.module';
import { SqlImportModule } from '../sql-import/sql-import.module';

@Module({
  imports: [CommonModule, SqlImportModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
