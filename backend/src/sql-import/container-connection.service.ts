import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import {
  DatabaseContainerInfo,
  ContainerConnectionConfig,
} from './dto/database-container.dto';

/**
 * Service responsible for database connections and container readiness checks
 */
@Injectable()
export class ContainerConnectionService {
  private readonly logger = new Logger(ContainerConnectionService.name);

  /**
   * Get connection configuration for a container
   */
  getConnectionConfig(
    containerInfo: DatabaseContainerInfo,
  ): ContainerConnectionConfig {
    return {
      host: 'localhost',
      port: containerInfo.port,
      database: 'tempdb',
      username: 'postgres',
      password: 'temppass',
    };
  }

  /**
   * Wait for PostgreSQL container to be ready
   */
  async waitForContainerReady(
    containerInfo: DatabaseContainerInfo,
  ): Promise<void> {
    const config = this.getConnectionConfig(containerInfo);
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const client = new Client({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.username,
          password: config.password,
        });

        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        this.logger.log(`Container ${containerInfo.containerId} is ready`);
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Container failed to become ready after ${maxAttempts} attempts: ${errorMessage}`,
          );
        }
        await this.sleep(2000); // Wait 2 seconds before retry
      }
    }
  }

  /**
   * Verify that a container connection is still working
   */
  async verifyContainerConnection(
    containerInfo: DatabaseContainerInfo,
  ): Promise<void> {
    const config = this.getConnectionConfig(containerInfo);
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } finally {
      await client.end();
    }
  }

  /**
   * Execute a query on a container
   */
  async executeQueryOnContainer(
    containerInfo: DatabaseContainerInfo,
    query: string,
  ): Promise<any> {
    const config = this.getConnectionConfig(containerInfo);
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });

    try {
      await client.connect();
      
      // Check if the query contains multiple statements (separated by semicolons)
      const statements = query.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      if (statements.length === 1) {
        // Single statement - execute directly
        const result = await client.query(query);
        return result.rows;
      } else {
        // Multiple statements - execute sequentially and return the last result
        let lastResult: any = [];
        
        for (const statement of statements) {
          const trimmedStatement = statement.trim();
          if (trimmedStatement) {
            const result = await client.query(trimmedStatement);
            // For SELECT statements, keep the result
            // For other statements, the result might be empty but we continue
            if (trimmedStatement.toUpperCase().startsWith('SELECT')) {
              lastResult = result.rows;
            }
          }
        }
        
        return lastResult;
      }
    } finally {
      await client.end();
    }
  }

  /**
   * Copy database schema and data to a container
   */
  async copyDatabaseToContainer(
    containerInfo: DatabaseContainerInfo,
    schema: string,
    seedData?: string,
  ): Promise<void> {
    const config = this.getConnectionConfig(containerInfo);
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });

    try {
      await client.connect();

      // Execute schema
      if (schema) {
        await client.query(schema);
      }

      // Execute seed data if provided
      if (seedData) {
        await client.query(seedData);
      }
    } finally {
      await client.end();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
