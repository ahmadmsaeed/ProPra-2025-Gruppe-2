import { Module } from '@nestjs/common';
import { SqlImportService } from './sql-import.service';
import { SqlImportController } from './sql-import.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { DatabaseImportService } from './database-import.service';
import { DatabaseExecutionService } from './database-execution.service';
import { DatabaseManagementService } from './database-management.service';
import { DatabaseContainerService } from './database-container.service';
import { ContainerManagementService } from './container-management.service';
import { ContainerConnectionService } from './container-connection.service';
import { ContainerCleanupService } from './container-cleanup.service';

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
    DatabaseContainerService,
    ContainerManagementService,
    ContainerConnectionService,
    ContainerCleanupService,
    {
      provide: DatabaseManagementService,
      useClass: DatabaseManagementService,
    },
  ],
  exports: [SqlImportService, DatabaseContainerService],
})
export class SqlImportModule {}
