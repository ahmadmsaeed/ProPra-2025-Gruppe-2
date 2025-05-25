import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SqlImportService } from './sql-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Multer } from 'multer';
import { PrismaService } from '../prisma/prisma.service';

@Controller('sql-import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SqlImportController {
  constructor(
    private readonly sqlImportService: SqlImportService,
    private readonly prisma: PrismaService,
  ) {}

  // Upload endpoint
  @Post('upload')
  @Roles(Role.TEACHER, Role.TUTOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
    @Request() req?: any,
  ) {
    // Get user ID from the authenticated request
    const authorId = req.user?.sub;
    return this.sqlImportService.importSqlFile(file, name, authorId);
  }

  // Databases endpoints
  @Get('databases')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async getDatabases() {
    return this.sqlImportService.getAvailableDatabases();
  }

  @Get('databases/:id')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async getDatabase(@Param('id') id: string) {
    return this.sqlImportService.findOne(+id);
  }

  @Post('databases')
  @Roles(Role.TEACHER)
  async createDatabase(@Body() data: any) {
    return this.sqlImportService.create(data);
  }

  @Patch('databases/:id')
  @Roles(Role.TEACHER, Role.TUTOR)
  @UseInterceptors(FileInterceptor('sqlFile'))
  async updateDatabase(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() sqlFile: Express.Multer.File,
    @Request() req: any,
  ) {
    console.log('Received request to update database with ID:', id);
    console.log('Request body:', body);
    console.log(
      'Received SQL file:',
      sqlFile ? 'Yes (size: ' + sqlFile.size + ')' : 'No',
    );

    // Parse database data from the request body - handle both database and direct properties
    let data;
    if (body.database) {
      data =
        typeof body.database === 'string'
          ? JSON.parse(body.database)
          : body.database;
    } else {
      // If no database field, use the body directly
      data = body;
    }

    console.log('Parsed database data:', data);

    // Check if the user has permission to update this database
    const database = await this.prisma.database.findUnique({
      where: { id: +id },
      select: {
        id: true,
        authorId: true,
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    console.log('Found database:', database);
    console.log('User ID:', req.user.sub, 'Role:', req.user.role);

    // Pass the user ID, role, and SQL file to the service
    return this.sqlImportService.update(
      +id,
      data,
      req.user.sub,
      req.user.role,
      sqlFile,
    );
  }

  @Delete('databases/:id')
  @Roles(Role.TEACHER, Role.TUTOR)
  async deleteDatabase(@Param('id') id: string, @Request() req: any) {
    // Check if the user has permission to delete this database
    const database = await this.prisma.database.findUnique({
      where: { id: +id },
      select: {
        id: true,
        authorId: true,
      } as any,
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    // Pass the user ID and role to the service
    return this.sqlImportService.delete(+id, req.user.sub, req.user.role);
  }

  // SQL query endpoint
  @Post('query')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async executeQuery(
    @Body('databaseId') databaseId: number,
    @Body('query') query: string,
  ) {
    return this.sqlImportService.executeQuery(databaseId, query);
  }

  // Test endpoint for temporary containers
  @Post('test-container/:studentId/:databaseId')
  @Roles(Role.TEACHER, Role.TUTOR) // Only for testing
  async testTemporaryContainer(
    @Param('studentId') studentId: string,
    @Param('databaseId') databaseId: string,
    @Body('query') query: string,
  ) {
    try {
      const result = await this.sqlImportService.executeQueryForStudent(
        parseInt(databaseId),
        query,
        parseInt(studentId),
      );
      return {
        success: true,
        result,
        message: 'Query executed successfully on temporary container',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to execute query on temporary container',
      };
    }
  }
}
