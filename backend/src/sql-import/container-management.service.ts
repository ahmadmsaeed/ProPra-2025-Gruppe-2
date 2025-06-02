import { Injectable, Logger } from '@nestjs/common';
import * as Docker from 'dockerode';
import * as net from 'net';

/**
 * Service responsible for Docker container lifecycle management
 */
@Injectable()
export class ContainerManagementService {
  private readonly logger = new Logger(ContainerManagementService.name);
  private readonly docker: Docker;
  private readonly portRange = { min: 5500, max: 5700 };
  private readonly pendingPorts = new Set<number>();

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Create a new PostgreSQL container
   */
  async createContainer(
    containerName: string,
    port: number,
  ): Promise<Docker.Container> {
    return this.docker.createContainer({
      Image: 'postgres:15',
      name: containerName,
      Env: [
        'POSTGRES_USER=postgres',
        'POSTGRES_PASSWORD=temppass',
        'POSTGRES_DB=tempdb',
        'POSTGRES_INITDB_ARGS=--auth-host=trust',
      ],
      HostConfig: {
        PortBindings: {
          '5432/tcp': [{ HostPort: port.toString() }],
        },
        AutoRemove: true,
      },
      ExposedPorts: {
        '5432/tcp': {},
      },
    });
  }

  /**
   * Start a container and return when it's running
   */
  async startContainer(container: Docker.Container): Promise<void> {
    await container.start();
  }

  /**
   * Stop and remove a container
   */
  async stopAndRemoveContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await container.remove();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Error stopping container ${containerId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Reserve an available port for container use
   */
  async reserveAvailablePort(): Promise<number> {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (this.pendingPorts.has(port)) {
        continue;
      }

      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        this.pendingPorts.add(port);
        return port;
      }
    }

    throw new Error('No available ports in the specified range');
  }

  /**
   * Release a reserved port
   */
  releasePort(port: number): void {
    this.pendingPorts.delete(port);
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * List all containers with a specific name pattern
   */
  async listContainersByPattern(
    pattern: string,
  ): Promise<Docker.ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers.filter((container) =>
      container.Names?.some((name) => name.includes(pattern)),
    );
  }

  /**
   * Get Docker container instance
   */
  getContainer(containerId: string): Docker.Container {
    return this.docker.getContainer(containerId);
  }
}
