import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module'; // Ensure AuthModule is imported for guards

@Module({
  imports: [AuthModule], // Make sure necessary modules are imported
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
