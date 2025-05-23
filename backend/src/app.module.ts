import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExerciseModule } from './exercise/exercise.module';
import { AdminModule } from './admin/admin.module';
import { SqlImportModule } from './sql-import/sql-import.module';
import { CommonModule } from './common/common.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExerciseModule,
    AdminModule,
    SqlImportModule,
    CommonModule,
    SubmissionsModule,
    // These will be uncommented when the modules are created
    // ExercisesModule,
    // SqlExecutionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
