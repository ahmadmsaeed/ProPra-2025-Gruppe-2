import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseContainerInfo } from './dto/database-container.dto';
import { ContainerManagementService } from './container-management.service';

/**
 * Service responsible for container cleanup and scheduled maintenance
 */
@Injectable()
export class ContainerCleanupService implements OnModuleInit {
  private readonly logger = new Logger(ContainerCleanupService.name);

  constructor(private containerManagement: ContainerManagementService) {}

  /**
   * Initialize cleanup service and perform initial cleanup
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing ContainerCleanupService...');

    try {
      await this.cleanupOrphanedContainers();
      this.logger.log('Initial container cleanup completed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to perform initial container cleanup:',
        errorMessage,
      );
    }
  }

  /**
   * Scheduled task to automatically cleanup containers older than 60 minutes
   * Runs every 5 minutes to check for expired containers
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledContainerCleanup(): Promise<void> {
    this.logger.debug('Running scheduled container cleanup check');

    try {
      await this.cleanupOrphanedContainers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Scheduled container cleanup failed:', errorMessage);
    }
  }

  /**
   * Clean up containers older than specified minutes
   */
  async cleanupOldContainers(
    activeContainers: Map<string, DatabaseContainerInfo>,
    maxAgeMinutes: number = 60,
  ): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const toCleanup: Array<{ studentId: number; databaseId: number }> = [];

    for (const [, info] of activeContainers.entries()) {
      if (info.createdAt < cutoffTime) {
        toCleanup.push({
          studentId: info.studentId,
          databaseId: info.originalDatabaseId,
        });
      }
    }

    for (const { studentId, databaseId } of toCleanup) {
      const containerKey = `${studentId}-${databaseId}`;
      const containerInfo = activeContainers.get(containerKey);
      if (containerInfo) {
        await this.cleanupSingleContainer(containerInfo, activeContainers);
      }
    }

    this.logger.log(`Cleaned up ${toCleanup.length} old containers`);
  }

  /**
   * Clean up all containers for a specific student
   */
  async cleanupAllContainersForStudent(
    activeContainers: Map<string, DatabaseContainerInfo>,
    studentId: number,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [, info] of activeContainers.entries()) {
      if (info.studentId === studentId) {
        promises.push(this.cleanupSingleContainer(info, activeContainers));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Clean up a single container
   */
  async cleanupSingleContainer(
    containerInfo: DatabaseContainerInfo,
    activeContainers: Map<string, DatabaseContainerInfo>,
  ): Promise<void> {
    const containerKey = `${containerInfo.studentId}-${containerInfo.originalDatabaseId}`;

    try {
      containerInfo.status = 'cleanup';

      await this.containerManagement.stopAndRemoveContainer(
        containerInfo.containerId,
      );
      this.containerManagement.releasePort(containerInfo.port);

      activeContainers.delete(containerKey);

      this.logger.log(
        `Successfully cleaned up container for student ${containerInfo.studentId}, database ${containerInfo.originalDatabaseId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to cleanup container ${containerInfo.containerId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Cleanup orphaned containers that exist in Docker but aren't tracked
   */
  async cleanupOrphanedContainers(): Promise<void> {
    try {
      const containers =
        await this.containerManagement.listContainersByPattern('/temp-db-');

      for (const container of containers) {
        try {
          await this.containerManagement.stopAndRemoveContainer(container.Id);
          this.logger.log(
            `Cleaned up orphaned container ${container.Names?.[0]}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to cleanup orphaned container ${container.Names?.[0]}: ${errorMessage}`,
          );
        }
      }

      if (containers.length > 0) {
        this.logger.log(`Cleaned up ${containers.length} orphaned containers`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to cleanup orphaned containers:', errorMessage);
    }
  }
}
