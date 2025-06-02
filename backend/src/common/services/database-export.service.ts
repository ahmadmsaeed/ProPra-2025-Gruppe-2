import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileService } from './file.service';

/**
 * Service for exporting database schemas and data
 */
@Injectable()
export class DatabaseExportService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
  ) {}

  /**
   * Exports a database schema as SQL file content
   */
  async exportDatabaseSql(databaseId: number): Promise<{
    sql: string;
    filename: string;
  }> {
    // Get the database
    const database = await this.prisma.database.findUnique({
      where: { id: databaseId },
    });

    if (!database) {
      throw new Error(`Database with ID ${databaseId} not found`);
    }

    // Combine schema and seed data with proper separators
    let sqlContent = '';

    // Add schema first
    if (database.schema) {
      sqlContent += `-- Schema for database "${database.name}"\n`;
      sqlContent += `-- Created: ${new Date().toISOString()}\n\n`;
      sqlContent += database.schema;
      sqlContent += '\n\n';
    }

    // Add seed data with a separator
    if (database.seedData) {
      sqlContent += `-- Seed data for database "${database.name}"\n\n`;
      sqlContent += database.seedData;
      sqlContent += '\n';
    }

    // Generate a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${database.name}_${timestamp}.sql`;

    return {
      sql: sqlContent,
      filename,
    };
  }
}
