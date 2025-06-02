import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseContainerService } from './database-container.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContainerConnectionService } from './container-connection.service';
import { ContainerManagementService } from './container-management.service';
import { ContainerCleanupService } from './container-cleanup.service';

describe('DatabaseContainerService', () => {
  let service: DatabaseContainerService;
  let prisma: { database: { findUnique: jest.Mock } };
  let connectionService: {
    executeQueryOnContainer: jest.Mock;
    copyDatabaseToContainer: jest.Mock;
    waitForContainerReady: jest.Mock;
    verifyContainerConnection: jest.Mock;
  };
  let managementService: {
    createContainer: jest.Mock;
    startContainer: jest.Mock;
    stopAndRemoveContainer: jest.Mock;
    reserveAvailablePort: jest.Mock;
    releasePort: jest.Mock;
  };
  let cleanupService: {
    cleanupOrphanedContainers: jest.Mock;
    cleanupSingleContainer: jest.Mock;
    cleanupAllContainersForStudent: jest.Mock;
    cleanupOldContainers: jest.Mock;
  };

  const mockDatabase = {
    id: 1,
    name: 'test-db',
    schema: 'CREATE TABLE test (id INT);',
    seedData: 'INSERT INTO test (id) VALUES (1);',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock Docker.Container with minimal required properties
  const mockContainer = {
    id: 'container-123',
    start: jest.fn(),
    stop: jest.fn(),
    remove: jest.fn(),
  } as any;

  beforeEach(async () => {
    prisma = { database: { findUnique: jest.fn() } };
    
    connectionService = {
      executeQueryOnContainer: jest.fn(),
      copyDatabaseToContainer: jest.fn(),
      waitForContainerReady: jest.fn(),
      verifyContainerConnection: jest.fn(),
    };

    managementService = {
      createContainer: jest.fn(),
      startContainer: jest.fn(),
      stopAndRemoveContainer: jest.fn(),
      reserveAvailablePort: jest.fn(),
      releasePort: jest.fn(),
    };

    cleanupService = {
      cleanupOrphanedContainers: jest.fn(),
      cleanupSingleContainer: jest.fn(),
      cleanupAllContainersForStudent: jest.fn(),
      cleanupOldContainers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseContainerService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContainerConnectionService, useValue: connectionService },
        { provide: ContainerManagementService, useValue: managementService },
        { provide: ContainerCleanupService, useValue: cleanupService },
      ],
    }).compile();

    service = module.get<DatabaseContainerService>(DatabaseContainerService);
  });  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemporaryContainer', () => {
    it('should create a new container successfully', async () => {
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      const result = await service.createTemporaryContainer(1, 1);

      expect(result).toBeDefined();
      expect(result.studentId).toBe(1);
      expect(result.originalDatabaseId).toBe(1);
      expect(result.port).toBe(5432);
      expect(result.status).toBe('ready');
      expect(managementService.reserveAvailablePort).toHaveBeenCalled();
      expect(managementService.createContainer).toHaveBeenCalled();
      expect(managementService.startContainer).toHaveBeenCalled();
      expect(connectionService.waitForContainerReady).toHaveBeenCalled();
      expect(connectionService.copyDatabaseToContainer).toHaveBeenCalled();
    });

    it('should return existing container if already ready', async () => {
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      connectionService.verifyContainerConnection.mockResolvedValue(undefined);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      // Create container first time
      const firstResult = await service.createTemporaryContainer(1, 1);
      
      // Reset mocks
      managementService.reserveAvailablePort.mockClear();
      managementService.createContainer.mockClear();
      
      // Try to create again - should return existing
      const secondResult = await service.createTemporaryContainer(1, 1);

      expect(firstResult).toEqual(secondResult);
      expect(managementService.reserveAvailablePort).not.toHaveBeenCalled();
      expect(managementService.createContainer).not.toHaveBeenCalled();
      expect(connectionService.verifyContainerConnection).toHaveBeenCalled();
    });

    it('should handle container creation failure', async () => {
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockRejectedValue(new Error('Docker error'));
      managementService.releasePort.mockReturnValue(undefined);

      await expect(service.createTemporaryContainer(1, 1)).rejects.toThrow('Docker error');
      
      expect(managementService.releasePort).toHaveBeenCalledWith(5432);
    });
  });

  describe('executeQueryOnContainer', () => {
    it('should execute query on ready container', async () => {
      const mockQueryResult = [{ id: 1, name: 'test' }];
      
      // Setup container first
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      connectionService.executeQueryOnContainer.mockResolvedValue(mockQueryResult);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      await service.createTemporaryContainer(1, 1);

      const result = await service.executeQueryOnContainer(1, 1, 'SELECT * FROM test');

      expect(result).toEqual(mockQueryResult);
      expect(connectionService.executeQueryOnContainer).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 1, originalDatabaseId: 1 }),
        'SELECT * FROM test'
      );
    });

    it('should throw error when container not found', async () => {
      await expect(
        service.executeQueryOnContainer(1, 1, 'SELECT * FROM test'),
      ).rejects.toThrow('Container not found or not ready');
    });

    it('should throw error when container not ready', async () => {
      // Setup container but don't make it ready
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      // Don't call waitForContainerReady to leave it in 'creating' status
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      // Start creation but don't await completion
      service.createTemporaryContainer(1, 1);

      await expect(
        service.executeQueryOnContainer(1, 1, 'SELECT * FROM test'),
      ).rejects.toThrow('Container not found or not ready');
    });
  });

  describe('cleanupContainer', () => {
    it('should cleanup existing container', async () => {
      // Setup container first
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      cleanupService.cleanupSingleContainer.mockResolvedValue(undefined);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      await service.createTemporaryContainer(1, 1);
      
      await service.cleanupContainer(1, 1);

      expect(cleanupService.cleanupSingleContainer).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 1, originalDatabaseId: 1 }),
        expect.any(Map)
      );
    });

    it('should handle cleanup of non-existent container gracefully', async () => {
      await service.cleanupContainer(1, 1);
      
      expect(cleanupService.cleanupSingleContainer).not.toHaveBeenCalled();
    });
  });

  describe('cleanupAllContainersForStudent', () => {
    it('should cleanup all containers for a student', async () => {
      cleanupService.cleanupAllContainersForStudent.mockResolvedValue(undefined);
      
      await service.cleanupAllContainersForStudent(1);
      
      expect(cleanupService.cleanupAllContainersForStudent).toHaveBeenCalledWith(
        expect.any(Map),
        1
      );
    });
  });

  describe('cleanupOldContainers', () => {
    it('should cleanup old containers with default age', async () => {
      cleanupService.cleanupOldContainers.mockResolvedValue(undefined);
      
      await service.cleanupOldContainers();
      
      expect(cleanupService.cleanupOldContainers).toHaveBeenCalledWith(
        expect.any(Map),
        60
      );
    });

    it('should cleanup old containers with custom age', async () => {
      cleanupService.cleanupOldContainers.mockResolvedValue(undefined);
      
      await service.cleanupOldContainers(30);
      
      expect(cleanupService.cleanupOldContainers).toHaveBeenCalledWith(
        expect.any(Map),
        30
      );
    });
  });

  describe('cleanupOrphanedContainers', () => {
    it('should cleanup orphaned containers', async () => {
      cleanupService.cleanupOrphanedContainers.mockResolvedValue(undefined);
      
      await service.cleanupOrphanedContainers();
      
      expect(cleanupService.cleanupOrphanedContainers).toHaveBeenCalled();
    });
  });

  describe('getActiveContainers', () => {
    it('should return copy of active containers map', async () => {
      const result = service.getActiveContainers();
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return active containers after creation', async () => {
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      await service.createTemporaryContainer(1, 1);
      
      const result = service.getActiveContainers();
      
      expect(result.size).toBe(1);
      expect(result.get('1-1')).toBeDefined();
    });
  });

  describe('getContainerInfo', () => {
    it('should return undefined for non-existent container', () => {
      const result = service.getContainerInfo(1, 1);
      
      expect(result).toBeUndefined();
    });

    it('should return container info for existing container', async () => {
      managementService.reserveAvailablePort.mockResolvedValue(5432);
      managementService.createContainer.mockResolvedValue(mockContainer);
      managementService.startContainer.mockResolvedValue(undefined);
      connectionService.waitForContainerReady.mockResolvedValue(undefined);
      connectionService.copyDatabaseToContainer.mockResolvedValue(undefined);
      prisma.database.findUnique.mockResolvedValue(mockDatabase);

      await service.createTemporaryContainer(1, 1);
      
      const result = service.getContainerInfo(1, 1);
      
      expect(result).toBeDefined();
      expect(result?.studentId).toBe(1);
      expect(result?.originalDatabaseId).toBe(1);
      expect(result?.status).toBe('ready');
    });
  });
});