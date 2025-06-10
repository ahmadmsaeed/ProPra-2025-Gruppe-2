import { Module } from '@nestjs/common';
import { ErrorService } from './services/error.service';
import { SqlProcessorService } from './services/sql-processor.service';
import { MySqlConverterService } from './services/mysql-converter.service';
import { FileService } from './services/file.service';
import { SqlValidatorService } from './services/sql-validator.service';
import { DatabaseTableManagerService } from './services/database-table-manager.service';
import { DatabaseAuditService } from './services/database-audit.service';
import { DatabaseValidatorService } from './services/database-validator.service';
import { DatabaseOwnershipService } from './services/database-ownership.service';
import { DatabaseExportService } from './services/database-export.service';
import { LlmFeedbackService } from './services/llm-feedback.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    ErrorService,
    SqlProcessorService,
    MySqlConverterService,
    FileService,
    SqlValidatorService,
    DatabaseTableManagerService,
    DatabaseAuditService,
    DatabaseValidatorService,
    DatabaseOwnershipService,
    DatabaseExportService,
    LlmFeedbackService,
  ],
  exports: [
    ErrorService,
    SqlProcessorService,
    MySqlConverterService,
    FileService,
    SqlValidatorService,
    DatabaseTableManagerService,
    DatabaseAuditService,
    DatabaseValidatorService,
    DatabaseOwnershipService,
    DatabaseExportService,
    LlmFeedbackService,
  ],
})
export class CommonModule {}
