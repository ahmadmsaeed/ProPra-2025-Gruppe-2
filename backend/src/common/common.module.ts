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
import { PrismaModule } from '../prisma/prisma.module';
import { DockerContainerService } from './services/docker-container.service';
import { ExerciseSessionService } from './services/exercise-session.service';
import { ContainerDatabaseClientService } from './services/container-database-client.service';

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
    DockerContainerService,
    ExerciseSessionService,
    ContainerDatabaseClientService,
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
    DockerContainerService,
    ExerciseSessionService,
    ContainerDatabaseClientService,
  ],
})
export class CommonModule {}
