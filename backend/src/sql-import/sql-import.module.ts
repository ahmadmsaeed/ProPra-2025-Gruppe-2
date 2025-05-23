import { Module, forwardRef } from '@nestjs/common';
import { SqlImportService } from './sql-import.service';
import { SqlImportController } from './sql-import.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { DatabaseImportService } from './database-import.service';
import { DatabaseExecutionService } from './database-execution.service';
import { DatabaseManagementService } from './database-management.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SqlImportController],
  providers: [
    SqlImportService,
    {
      provide: DatabaseImportService,
      useClass: DatabaseImportService,
    },
    DatabaseExecutionService,
    {
      provide: DatabaseManagementService,
      useClass: DatabaseManagementService,
    },
  ],
  exports: [SqlImportService],
})
export class SqlImportModule {}
