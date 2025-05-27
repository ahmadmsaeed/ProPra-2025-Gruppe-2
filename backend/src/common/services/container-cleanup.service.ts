import { Injectable, Logger } from '@nestjs/common';
import { DatabaseContainerService } from '../../sql-import/database-container.service';

@Injectable()
export class ContainerCleanupService {
  private readonly logger = new Logger(ContainerCleanupService.name);

  constructor(private containerService: DatabaseContainerService) {}

  /**
   * Manual cleanup method for all containers of a specific student
   */
  async cleanupStudentContainers(studentId: number): Promise<void> {
    this.logger.log(`Cleaning up all containers for student ${studentId}`);

    try {
      await this.containerService.cleanupAllContainersForStudent(studentId);
      this.logger.log(
        `Successfully cleaned up containers for student ${studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup containers for student ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Manual cleanup for old containers
   */
  async cleanupOldContainers(maxAgeMinutes: number = 60): Promise<void> {
    this.logger.log('Starting manual container cleanup...');

    try {
      await this.containerService.cleanupOldContainers(maxAgeMinutes);
      this.logger.log('Manual container cleanup completed successfully');
    } catch (error) {
      this.logger.error('Manual container cleanup failed:', error);
      throw error;
    }
  }
}
