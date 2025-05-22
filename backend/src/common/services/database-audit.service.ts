import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DatabaseAuditService {
  private readonly logger = new Logger(DatabaseAuditService.name);

  /**
   * Logs database creation events
   */
  logDatabaseCreation(
    database: any,
    authorId: number | null,
    tableInfo: any,
  ): void {
    this.logger.log(
      `Database created: "${database.name}" (ID: ${database.id}) by user ${authorId || 'unknown'} with ${tableInfo.tableCount} tables: ${tableInfo.tableNames.join(', ') || 'none detected'}`,
    );
  }

  /**
   * Logs database update events
   */
  logDatabaseUpdate(database: any, userId: number | null, updates: any): void {
    this.logger.log(
      `Database updated: "${database.name}" (ID: ${database.id}) by user ${userId || 'unknown'}. Fields updated: ${Object.keys(updates).join(', ')}`,
    );
  }

  /**
   * Logs database deletion events including dropped tables
   */
  logDatabaseDeletion(
    database: any,
    userId: number | null,
    droppedTables: string[],
  ): void {
    this.logger.log(
      `Database deleted: "${database.name}" (ID: ${database.id}) by user ${userId || 'unknown'}. Tables dropped: ${droppedTables.join(', ') || 'none'}`,
    );
  }

  /**
   * Logs SQL execution events
   */
  logSqlExecution(
    databaseId: number,
    statements: number,
    success: boolean,
    message: string,
  ): void {
    if (success) {
      this.logger.log(
        `SQL execution on database ID ${databaseId}: ${statements} statements executed successfully. ${message}`,
      );
    } else {
      this.logger.error(
        `SQL execution failed on database ID ${databaseId}: ${message}`,
      );
    }
  }

  /**
   * Logs database query execution
   */
  logQueryExecution(databaseId: number, query: string, success: boolean): void {
    const truncatedQuery =
      query.length > 100 ? query.substring(0, 97) + '...' : query;

    if (success) {
      this.logger.log(
        `Query executed on database ID ${databaseId}: ${truncatedQuery}`,
      );
    } else {
      this.logger.error(
        `Query failed on database ID ${databaseId}: ${truncatedQuery}`,
      );
    }
  }
}
