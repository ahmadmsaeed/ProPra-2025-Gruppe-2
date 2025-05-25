import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import * as Docker from 'dockerode';
import { DatabaseContainerInfo, ContainerConnectionConfig } from './dto/database-container.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseContainerService {
  private readonly logger = new Logger(DatabaseContainerService.name);
  private readonly docker: Docker;
  private readonly activeContainers = new Map<string, DatabaseContainerInfo>();
  private readonly portRange = { min: 5500, max: 5600 }; // Port range for temporary containers

  constructor(private prisma: PrismaService) {
    this.docker = new Docker();
  }

  /**
   * Create a temporary database container for a student
   */
  async createTemporaryContainer(
    studentId: number,
    originalDatabaseId: number,
  ): Promise<DatabaseContainerInfo> {
    const containerKey = `${studentId}-${originalDatabaseId}`;
      // Check if container already exists
    if (this.activeContainers.has(containerKey)) {
      const existing = this.activeContainers.get(containerKey);
      if (existing && existing.status === 'ready') {
        return existing;
      }
    }

    try {
      const port = await this.findAvailablePort();
      const containerName = `temp-db-${studentId}-${originalDatabaseId}-${Date.now()}`;
      
      this.logger.log(`Creating temporary container ${containerName} on port ${port}`);

      // Create container
      const container = await this.docker.createContainer({
        Image: 'postgres:15',
        name: containerName,
        Env: [
          'POSTGRES_USER=postgres',
          'POSTGRES_PASSWORD=temppass',
          'POSTGRES_DB=tempdb'
        ],
        HostConfig: {
          PortBindings: {
            '5432/tcp': [{ HostPort: port.toString() }]
          },
          AutoRemove: true, // Auto-remove when stopped
        },
        ExposedPorts: {
          '5432/tcp': {}
        }
      });

      // Start container
      await container.start();

      const containerInfo: DatabaseContainerInfo = {
        containerId: container.id,
        databaseName: 'tempdb',
        port: port,
        studentId,
        originalDatabaseId,
        createdAt: new Date(),
        status: 'creating'
      };

      this.activeContainers.set(containerKey, containerInfo);

      // Wait for container to be ready and copy database
      await this.waitForContainerReady(containerInfo);
      await this.copyDatabaseToContainer(originalDatabaseId, containerInfo);

      containerInfo.status = 'ready';
      this.activeContainers.set(containerKey, containerInfo);

      this.logger.log(`Container ${containerName} is ready for student ${studentId}`);
      
      return containerInfo;
    } catch (error) {
      this.logger.error(`Failed to create container for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection config for a temporary container
   */
  getConnectionConfig(containerInfo: DatabaseContainerInfo): ContainerConnectionConfig {
    return {
      host: 'localhost',
      port: containerInfo.port,
      database: containerInfo.databaseName,
      username: 'postgres',
      password: 'temppass'
    };
  }

  /**
   * Execute query on temporary container
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
      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      this.logger.error(`Query execution failed on container ${containerInfo.containerId}:`, error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Clean up temporary container for a student
   */
  async cleanupContainer(studentId: number, originalDatabaseId: number): Promise<void> {
    const containerKey = `${studentId}-${originalDatabaseId}`;
    const containerInfo = this.activeContainers.get(containerKey);

    if (!containerInfo) {
      return;
    }

    try {
      containerInfo.status = 'cleanup';
      const container = this.docker.getContainer(containerInfo.containerId);
      
      // Stop and remove container
      await container.stop();
      // Container will be auto-removed due to AutoRemove flag
      
      this.activeContainers.delete(containerKey);
      this.logger.log(`Cleaned up container for student ${studentId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup container for student ${studentId}:`, error);
    }
  }
  /**
   * Clean up all containers for a student
   */
  async cleanupAllContainersForStudent(studentId: number): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [key, info] of this.activeContainers.entries()) {
      if (info.studentId === studentId) {
        promises.push(this.cleanupContainer(studentId, info.originalDatabaseId));
      }
    }

    await Promise.all(promises);
  }
  /**
   * Clean up containers older than specified minutes
   */
  async cleanupOldContainers(maxAgeMinutes: number = 60): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const toCleanup: Array<{ studentId: number; databaseId: number }> = [];

    for (const [key, info] of this.activeContainers.entries()) {
      if (info.createdAt < cutoffTime) {
        toCleanup.push({ studentId: info.studentId, databaseId: info.originalDatabaseId });
      }
    }

    for (const { studentId, databaseId } of toCleanup) {
      await this.cleanupContainer(studentId, databaseId);
    }

    this.logger.log(`Cleaned up ${toCleanup.length} old containers`);
  }

  /**
   * Wait for PostgreSQL container to be ready
   */
  private async waitForContainerReady(containerInfo: DatabaseContainerInfo): Promise<void> {
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Container ${containerInfo.containerId} failed to become ready after ${maxAttempts} attempts`);
  }
  /**
   * Copy database schema and data to temporary container
   */
  private async copyDatabaseToContainer(
    originalDatabaseId: number,
    containerInfo: DatabaseContainerInfo,
  ): Promise<void> {
    // Get the original database
    const originalDb = await this.prisma.database.findUnique({
      where: { id: originalDatabaseId }
    });

    if (!originalDb) {
      throw new Error(`Original database ${originalDatabaseId} not found`);
    }

    // Execute the schema and seed data on the temporary container
    if (originalDb.schema) {
      await this.executeQueryOnContainer(containerInfo, originalDb.schema);
    }
    
    if (originalDb.seedData) {
      await this.executeQueryOnContainer(containerInfo, originalDb.seedData);
    }
    
    this.logger.log(`Database copied to container ${containerInfo.containerId}`);
  }

  /**
   * Find an available port in the configured range
   */
  private async findAvailablePort(): Promise<number> {
    const usedPorts = new Set(
      Array.from(this.activeContainers.values()).map(info => info.port)
    );

    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!usedPorts.has(port)) {
        return port;
      }
    }

    throw new Error('No available ports in the configured range');
  }
}
