import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { BlockedUserGuard } from './blocked-user.guard'; // Corrected path (already correct)
import { PrismaService } from '../prisma/prisma.service'; // Corrected path

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret', // <-- Changed default to match JwtStrategy
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, BlockedUserGuard, PrismaService], // Provide BlockedUserGuard and PrismaService
  controllers: [AuthController],
  exports: [AuthService, JwtModule, BlockedUserGuard], // Export BlockedUserGuard if needed elsewhere directly
})
export class AuthModule {}
