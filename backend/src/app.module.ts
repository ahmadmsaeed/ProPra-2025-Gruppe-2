import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
// Import new modules for SQL learning platform
// These will need to be created later
// import { ExercisesModule } from './exercises/exercises.module';
// import { SubmissionsModule } from './submissions/submissions.module';
// import { SqlExecutionModule } from './sql-execution/sql-execution.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    // These will be uncommented when the modules are created
    // ExercisesModule,
    // SubmissionsModule,
    // SqlExecutionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService
    // Guards werden jetzt nur noch gezielt an Controllern/Methoden verwendet!
  ],
})
export class AppModule {}
