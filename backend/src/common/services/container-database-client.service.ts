import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Client } from 'pg';
import { DockerContainerService } from './docker-container.service';

@Injectable()
export class ContainerDatabaseClientService {
  private readonly logger = new Logger(ContainerDatabaseClientService.name);

  constructor(
    @Inject(forwardRef(() => DockerContainerService))
    private readonly dockerService: DockerContainerService,
  ) {}
  
  /**
   * Execute a query on a specific container
   */
  async executeQuery(sessionId: string, query: string): Promise<any> {
    try {
      // Get the container's connection string
      const connectionString = this.dockerService.getConnectionString(sessionId);
      
      // Create a client to connect to the container
      const client = new Client({
        connectionString,
      });
      
      // Connect to the database
      await client.connect();
      
      try {
        // Execute the query
        const result = await client.query(query);
        return result.rows;
      } finally {
        // Always close the connection
        await client.end();
      }
    } catch (error) {
      this.logger.error(`Error executing query on container: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Initialize a container database with schema and seed data
   */
  async initializeDatabase(sessionId: string, schema: string, seedData: string): Promise<void> {
    try {
      // Get the container's connection string
      const connectionString = this.dockerService.getConnectionString(sessionId);
      
      // Create a client to connect to the container
      const client = new Client({
        connectionString,
      });
      
      // Connect to the database
      await client.connect();
      
      try {
        // Execute schema creation
        if (schema && schema.trim()) {
          this.logger.log(`Executing schema on container ${sessionId}`);
          await client.query(schema);
        }
        
        // Execute seed data insertion
        if (seedData && seedData.trim()) {
          this.logger.log(`Executing seed data on container ${sessionId}`);
          await client.query(seedData);
        }
      } finally {
        // Always close the connection
        await client.end();
      }
    } catch (error) {
      this.logger.error(`Error initializing database on container: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Execute a batch of SQL statements on a container
   */
  async executeBatch(
    sessionId: string,
    statements: string[],
  ): Promise<{
    success: boolean;
    successCount: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let successCount = 0;
    
    try {
      // Get the container's connection string
      const connectionString = this.dockerService.getConnectionString(sessionId);
      
      // Create a client to connect to the container
      const client = new Client({
        connectionString,
      });
      
      // Connect to the database
      await client.connect();
      
      try {
        // Execute each statement
        for (const statement of statements) {
          if (!statement.trim()) continue;
          
          try {
            await client.query(statement);
            successCount++;
          } catch (error) {
            // Handle non-critical errors (e.g. table already exists)
            if (this.isNonCriticalError(error)) {
              warnings.push(`Warning: ${error.message}`);
            } else {
              errors.push(`Error: ${error.message}`);
            }
          }
        }
        
        // Build response message
        let message = `Executed ${successCount} statements successfully.`;
        if (warnings.length > 0) {
          message += ` ${warnings.length} warnings occurred.`;
        }
        if (errors.length > 0) {
          message += ` ${errors.length} errors occurred.`;
        }
        
        return {
          success: errors.length === 0,
          successCount,
          errors,
          warnings,
          message,
        };
      } finally {
        // Always close the connection
        await client.end();
      }
    } catch (error) {
      this.logger.error(`Error executing batch on container: ${error.message}`);
      return {
        success: false,
        successCount,
        errors: [...errors, `Connection error: ${error.message}`],
        warnings,
        message: `Failed to execute batch: ${error.message}`,
      };
    }
  }
  
  /**
   * Check if an error is non-critical
   */
  private isNonCriticalError(error: any): boolean {
    // PostgreSQL error codes for non-critical errors
    const nonCriticalErrors = [
      '42P07', // duplicate_table
      '23505',  // unique_violation
      // Add more as needed
    ];
    
    return nonCriticalErrors.includes(error.code);
  }
} 