/**
 * Module for providing PrismaService as a global/shared provider.
 * Allows PrismaService to be injected into other modules.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make module global so it doesn't need to be imported in every module
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export PrismaService to make it available in other modules
})
export class PrismaModule {}
