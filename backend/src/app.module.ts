/**
 * Root module for the SQL Learning Platform backend.
 * Imports all feature modules and sets up global providers/controllers.
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ExerciseModule } from './exercise/exercise.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';
// Import new modules for SQL learning platform
// These will need to be created later
// import { ExercisesModule } from './exercises/exercises.module';
// import { SubmissionsModule } from './submissions/submissions.module';
// import { SqlExecutionModule } from './sql-execution/sql-execution.module';

@Module({
  imports: [
    AuthModule,
    ExerciseModule,
    DatabaseModule,
    AdminModule,
    // These will be uncommented when the modules are created
    // ExercisesModule,
    // SubmissionsModule,
    // SqlExecutionModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
