/**
 * Module for providing PrismaService as a global/shared provider.
 * Allows PrismaService to be injected into other modules.
 */
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],  // Export PrismaService to make it available in other modules
})
export class PrismaModule {}
