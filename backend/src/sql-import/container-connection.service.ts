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
      const statements = query
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

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

      // Execute schema - improved parsing and execution
      if (schema) {
        await this.executeSchemaStatements(client, schema);
      }

      // Execute seed data if provided
      if (seedData) {
        await this.executeSeedStatements(client, seedData);
      }
    } finally {
      await client.end();
    }
  }

  /**
   * Execute schema statements with improved parsing and error handling
   */
  private async executeSchemaStatements(client: any, schema: string): Promise<void> {
    // Improved SQL statement parsing
    const statements = this.parseSQL(schema);
    
    // Separate CREATE TABLE statements from other statements
    const createTableStatements = statements.filter(stmt => 
      stmt.toUpperCase().trim().startsWith('CREATE TABLE')
    );
    const otherStatements = statements.filter(stmt => 
      !stmt.toUpperCase().trim().startsWith('CREATE TABLE')
    );
    
    this.logger.log(`Found ${createTableStatements.length} CREATE TABLE statements and ${otherStatements.length} other statements`);
    
    // Execute CREATE TABLE statements first (without foreign keys)
    for (let i = 0; i < createTableStatements.length; i++) {
      const statement = createTableStatements[i];
      try {
        // Remove foreign key constraints for initial table creation
        const statementWithoutFKs = this.removeForeignKeyConstraints(statement);
        await client.query(statementWithoutFKs);
        this.logger.log(`Table creation ${i + 1}/${createTableStatements.length} executed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error creating table ${i + 1}/${createTableStatements.length}: ${statement.substring(0, 100)}...`);
        this.logger.error(`Error details: ${errorMessage}`);
        
        // Continue with other tables even if one fails
        if (!errorMessage.includes('already exists')) {
          this.logger.warn(`Continuing with remaining tables despite error`);
        }
      }
    }
    
    // Execute other statements (ALTER TABLE, CREATE INDEX, etc.)
    for (let i = 0; i < otherStatements.length; i++) {
      const statement = otherStatements[i];
      try {
        await client.query(statement);
        this.logger.log(`Other statement ${i + 1}/${otherStatements.length} executed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error executing statement ${i + 1}/${otherStatements.length}: ${statement.substring(0, 100)}...`);
        this.logger.error(`Error details: ${errorMessage}`);
        
        // Don't throw for DROP statements or IF EXISTS statements
        if (!statement.toUpperCase().includes('DROP') && 
            !statement.toUpperCase().includes('IF EXISTS') &&
            !statement.toUpperCase().includes('IF NOT EXISTS')) {
          this.logger.warn(`Continuing despite error: ${errorMessage}`);
        }
      }
    }
    
    // Add foreign key constraints separately
    await this.addForeignKeyConstraints(client, createTableStatements);
  }

  /**
   * Execute seed data statements with better error handling
   */
  private async executeSeedStatements(client: any, seedData: string): Promise<void> {
    const statements = this.parseSQL(seedData);
    
    this.logger.log(`Executing ${statements.length} seed data statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.query(statement);
        this.logger.log(`Seed statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error executing seed statement ${i + 1}/${statements.length}: ${statement.substring(0, 100)}...`);
        this.logger.error(`Error details: ${errorMessage}`);
        
        // For seed data, be more lenient with errors
        if (errorMessage.includes('duplicate key') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('UNIQUE constraint failed')) {
          this.logger.warn(`Continuing despite duplicate data error: ${errorMessage}`);
        } else {
          this.logger.warn(`Continuing despite seed data error: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Improved SQL parsing that handles complex statements
   */
  private parseSQL(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inQuotes = false;
    let quoteChar = '';
    let parenthesesDepth = 0;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      // Handle quotes
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        // Check for escaped quotes
        if (nextChar !== quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          i++; // Skip escaped quote
        }
      }
      
      // Handle parentheses (only when not in quotes)
      if (!inQuotes) {
        if (char === '(') {
          parenthesesDepth++;
        } else if (char === ')') {
          parenthesesDepth--;
        }
      }
      
      currentStatement += char;
      
      // Check for statement terminator
      if (char === ';' && !inQuotes && parenthesesDepth === 0) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 1) { // Ignore just semicolons
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Add remaining statement if any
    const remaining = currentStatement.trim();
    if (remaining.length > 0 && remaining !== ';') {
      statements.push(remaining);
    }
    
    return statements.filter(stmt => stmt.length > 0);
  }

  /**
   * Remove foreign key constraints from CREATE TABLE statement
   */
  private removeForeignKeyConstraints(statement: string): string {
    // Remove FOREIGN KEY constraints and REFERENCES
    return statement
      .replace(/,\s*FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+[^,)]+(?:\([^)]+\))?[^,)]*/gi, '')
      .replace(/\s+REFERENCES\s+[^\s,)]+(?:\([^)]+\))?(?:\s+ON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi, '')
      .replace(/,(\s*\))/g, '$1') // Remove trailing commas before closing parenthesis
      .replace(/,\s*,/g, ','); // Remove double commas
  }

  /**
   * Add foreign key constraints separately after all tables are created
   */
  private async addForeignKeyConstraints(client: any, createTableStatements: string[]): Promise<void> {
    const alterStatements: string[] = [];
    
    for (const statement of createTableStatements) {
      const tableName = this.extractTableName(statement);
      if (!tableName) continue;
      
      // Extract foreign key constraints
      const fkMatches = statement.match(/,\s*FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s,)]+)(?:\(([^)]+)\))?([^,)]*)/gi);
      
      if (fkMatches) {
        for (const fkMatch of fkMatches) {
          try {
            const alterStatement = this.createAlterTableStatement(tableName, fkMatch);
            if (alterStatement) {
              alterStatements.push(alterStatement);
            }
          } catch (error) {
            this.logger.warn(`Could not parse foreign key constraint: ${fkMatch}`);
          }
        }
      }
    }
    
    // Execute ALTER TABLE statements for foreign keys
    for (let i = 0; i < alterStatements.length; i++) {
      const statement = alterStatements[i];
      try {
        await client.query(statement);
        this.logger.log(`Foreign key constraint ${i + 1}/${alterStatements.length} added successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Could not add foreign key constraint: ${errorMessage}`);
      }
    }
  }

  /**
   * Extract table name from CREATE TABLE statement
   */
  private extractTableName(statement: string): string | null {
    const match = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([^\s(;"]+))/i);
    return match ? (match[1] || match[2]) : null;
  }

  /**
   * Create ALTER TABLE statement for foreign key
   */
  private createAlterTableStatement(tableName: string, fkConstraint: string): string | null {
    const match = fkConstraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s,)]+)(?:\(([^)]+)\))?/i);
    if (!match) return null;
    
    const columnName = match[1].trim().replace(/"/g, '');
    const referencedTable = match[2].trim().replace(/"/g, '');
    const referencedColumn = match[3] ? match[3].trim().replace(/"/g, '') : 'id';
    
    const constraintName = `fk_${tableName}_${columnName}_${referencedTable}`;
    
    return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${columnName}") REFERENCES "${referencedTable}"("${referencedColumn}")`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
