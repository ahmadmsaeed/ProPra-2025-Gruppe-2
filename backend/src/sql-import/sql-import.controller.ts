import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Request,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SqlImportService } from './sql-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from '../types/auth.types';
import {
  DatabaseCreateData,
  DatabaseUpdateData,
  DatabaseRequestBody,
} from './interfaces/database.interfaces';

@Controller('sql-import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SqlImportController {
  private readonly logger = new Logger(SqlImportController.name);

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
    @Request() req?: AuthenticatedRequest,
  ) {
    // Get user ID from the authenticated request
    const authorId = req?.user?.sub;
    return this.sqlImportService.importSqlFile(file, name, authorId);
  }

  // Databases endpoints
  @Get('databases')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async getDatabases() {
    return this.sqlImportService.getAllDatabases();
  }

  @Get('databases/:id')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async getDatabase(@Param('id') id: string) {
    return this.sqlImportService.getDatabase(+id);
  }

  @Post('databases')
  @Roles(Role.TEACHER)
  async createDatabase(@Body() data: DatabaseCreateData) {
    return this.sqlImportService.create(data);
  }

  @Patch('databases/:id')
  @Roles(Role.TEACHER, Role.TUTOR)
  @UseInterceptors(FileInterceptor('sqlFile'))
  async updateDatabase(
    @Param('id') id: string,
    @Body() body: DatabaseRequestBody,
    @UploadedFile() sqlFile: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.debug('Received request to update database with ID:', id);
    this.logger.debug('Request body:', body);
    this.logger.debug(
      'Received SQL file:',
      sqlFile ? 'Yes (size: ' + sqlFile.size + ')' : 'No',
    );

    // Parse database data from the request body - handle both database and direct properties
    let data: DatabaseUpdateData;
    if (body.database) {
      data =
        typeof body.database === 'string'
          ? (JSON.parse(body.database) as DatabaseUpdateData)
          : body.database;
    } else {
      // If no database field, use the body directly
      data = body;
    }

    this.logger.debug('Parsed database data:', data);

    // Check if the user has permission to update this database
    const database = await this.prisma.database.findUnique({
      where: { id: +id },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    this.logger.debug('Found database:', database);
    this.logger.debug('User ID:', req.user.sub, 'Role:', req.user.role);

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
  async deleteDatabase(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // Check if the user has permission to delete this database
    const database = await this.prisma.database.findUnique({
      where: { id: +id },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!database) {
      throw new NotFoundException(`Database with ID ${id} not found`);
    }

    // Pass the user ID and role to the service
    return this.sqlImportService.deleteDatabase(
      +id,
      req.user.sub,
      req.user.role,
    );
  }

  // SQL query endpoint
  @Post('query')
  @Roles(Role.TEACHER, Role.TUTOR, Role.STUDENT)
  async executeQuery(
    @Body('databaseId') databaseId: number,
    @Body('query') query: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    // Students use temporary containers, teachers/tutors use direct execution
    if (req.user.role === 'STUDENT') {
      const studentId = req.user.sub;
      return this.sqlImportService.executeQueryForStudent(
        databaseId,
        query,
        studentId,
      );
    }

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
      const result = (await this.sqlImportService.executeQueryForStudent(
        parseInt(databaseId),
        query,
        parseInt(studentId),
      )) as unknown;
      return {
        success: true,
        result,
        message: 'Query executed successfully on temporary container',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        message: 'Failed to execute query on temporary container',
      };
    }
  }

  // Reset a student's container for a specific database
  @Post('reset-container')
  @Roles(Role.STUDENT)
  async resetContainer(
    @Body('databaseId') databaseId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      // Get the student ID from the JWT token
      const studentId = req.user.sub;

      await this.sqlImportService.resetStudentContainer(databaseId, studentId);

      return {
        success: true,
        message: 'Database container has been reset successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        message: 'Failed to reset database container',
      };
    }
  }

  // Initialize container when a student starts an exercise
  @Post('initialize-container')
  @Roles(Role.STUDENT)
  async initializeContainer(
    @Body('databaseId') databaseId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      // Get the student ID from the JWT token
      const studentId = req.user.sub;

      await this.sqlImportService.initializeStudentContainer(
        databaseId,
        studentId,
      );

      return {
        success: true,
        message: 'Database container has been initialized successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        message: 'Failed to initialize database container',
      };
    }
  }
}
