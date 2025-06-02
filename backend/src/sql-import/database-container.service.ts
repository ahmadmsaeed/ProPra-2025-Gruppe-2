import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseContainerInfo } from './dto/database-container.dto';
import { ContainerManagementService } from './container-management.service';
import { ContainerConnectionService } from './container-connection.service';
import { ContainerCleanupService } from './container-cleanup.service';

/**
 * Main service for database container operations
 * Coordinates between management, connection, and cleanup services
 */
@Injectable()
export class DatabaseContainerService {
  private readonly logger = new Logger(DatabaseContainerService.name);
  private readonly activeContainers = new Map<string, DatabaseContainerInfo>();
  private readonly creationLocks = new Map<
    string,
    Promise<DatabaseContainerInfo>
  >();

  constructor(
    private prisma: PrismaService,
    private containerManagement: ContainerManagementService,
    private containerConnection: ContainerConnectionService,
    private containerCleanup: ContainerCleanupService,
  ) {}

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
        try {
          await this.containerConnection.verifyContainerConnection(existing);
          return existing;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Existing container failed verification, recreating: ${errorMessage}`,
          );
          await this.cleanupContainer(
            existing.studentId,
            existing.originalDatabaseId,
          );
        }
      }
    }

    // Check if there's already a creation in progress
    if (this.creationLocks.has(containerKey)) {
      this.logger.log(
        `Container creation already in progress for ${containerKey}, waiting...`,
      );
      return await this.creationLocks.get(containerKey)!;
    }

    // Create the container creation promise and store it as a lock
    const creationPromise = this.createContainerInternal(
      studentId,
      originalDatabaseId,
      containerKey,
    );
    this.creationLocks.set(containerKey, creationPromise);

    try {
      const result = await creationPromise;
      return result;
    } finally {
      // Always remove the lock when done (success or failure)
      this.creationLocks.delete(containerKey);
    }
  }

  /**
   * Internal method to actually create the container
   */
  private async createContainerInternal(
    studentId: number,
    originalDatabaseId: number,
    containerKey: string,
  ): Promise<DatabaseContainerInfo> {
    const containerName = `temp-db-${studentId}-${originalDatabaseId}-${Date.now()}`;
    let port: number | undefined;

    try {
      port = await this.containerManagement.reserveAvailablePort();

      this.logger.log(
        `Creating temporary container ${containerName} on port ${port}`,
      );

      // Create container
      const container = await this.containerManagement.createContainer(
        containerName,
        port,
      );

      // Start container
      await this.containerManagement.startContainer(container);

      const containerInfo: DatabaseContainerInfo = {
        containerId: container.id,
        databaseName: containerName,
        port,
        studentId,
        originalDatabaseId,
        createdAt: new Date(),
        status: 'creating',
      };

      this.activeContainers.set(containerKey, containerInfo);

      // Wait for container to be ready
      await this.containerConnection.waitForContainerReady(containerInfo);

      // Copy database data
      const database = await this.prisma.database.findUnique({
        where: { id: originalDatabaseId },
      });

      if (database) {
        await this.containerConnection.copyDatabaseToContainer(
          containerInfo,
          database.schema,
          database.seedData,
        );
      }

      containerInfo.status = 'ready';

      this.logger.log(
        `Container ${containerName} is ready for student ${studentId}`,
      );
      return containerInfo;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create container: ${errorMessage}`);

      if (port) {
        this.containerManagement.releasePort(port);
      }

      this.activeContainers.delete(containerKey);
      throw error;
    }
  }

  /**
   * Execute a query on a container
   */
  async executeQueryOnContainer(
    studentId: number,
    originalDatabaseId: number,
    query: string,
  ): Promise<any> {
    const containerKey = `${studentId}-${originalDatabaseId}`;
    const containerInfo = this.activeContainers.get(containerKey);

    if (!containerInfo || containerInfo.status !== 'ready') {
      throw new Error('Container not found or not ready');
    }

    return this.containerConnection.executeQueryOnContainer(
      containerInfo,
      query,
    );
  }

  /**
   * Clean up a specific container
   */
  async cleanupContainer(
    studentId: number,
    originalDatabaseId: number,
  ): Promise<void> {
    const containerKey = `${studentId}-${originalDatabaseId}`;
    const containerInfo = this.activeContainers.get(containerKey);

    if (!containerInfo) {
      this.logger.warn(
        `No container found for student ${studentId}, database ${originalDatabaseId}`,
      );
      return;
    }

    await this.containerCleanup.cleanupSingleContainer(
      containerInfo,
      this.activeContainers,
    );
  }

  /**
   * Clean up all containers for a student
   */
  async cleanupAllContainersForStudent(studentId: number): Promise<void> {
    await this.containerCleanup.cleanupAllContainersForStudent(
      this.activeContainers,
      studentId,
    );
  }

  /**
   * Clean up old containers
   */
  async cleanupOldContainers(maxAgeMinutes: number = 60): Promise<void> {
    await this.containerCleanup.cleanupOldContainers(
      this.activeContainers,
      maxAgeMinutes,
    );
  }

  /**
   * Clean up orphaned containers
   */
  async cleanupOrphanedContainers(): Promise<void> {
    await this.containerCleanup.cleanupOrphanedContainers();
  }

  /**
   * Get active containers (for monitoring/debugging)
   */
  getActiveContainers(): Map<string, DatabaseContainerInfo> {
    return new Map(this.activeContainers);
  }

  /**
   * Get container info for a specific student/database combination
   */
  getContainerInfo(
    studentId: number,
    originalDatabaseId: number,
  ): DatabaseContainerInfo | undefined {
    const containerKey = `${studentId}-${originalDatabaseId}`;
    return this.activeContainers.get(containerKey);
  }
}
