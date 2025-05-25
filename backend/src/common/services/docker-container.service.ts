import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Client } from 'pg';

interface DockerContainer {
  id: string;
  studentId: number;
  exerciseId: number;
  databaseId: number;
  containerId: string;
  port: number;
  createdAt: Date;
  status: 'starting' | 'running' | 'error' | 'stopped';
}

@Injectable()
export class DockerContainerService {
  private readonly logger = new Logger(DockerContainerService.name);

  // In-memory store of active containers (would be replaced with database in production)
  private containers: Map<string, DockerContainer> = new Map();

  // Track ports in use to avoid conflicts
  private usedPorts: Set<number> = new Set();
  private readonly PORT_RANGE_START = 5434; // Start after main PostgreSQL port 5433
  private readonly PORT_RANGE_END = 5534; // Allow 100 concurrent container ports

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
  ) {
    // Periodically check and stop containers older than 7 days
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, container] of this.containers.entries()) {
        if (now - container.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
          this.stopAndRemoveContainer(sessionId);
        }
      }
    }, 12 * 60 * 60 * 1000); // Check every 12 hours
  }

  /**
   * Create a new PostgreSQL container for a specific student and exercise
   */
  async createContainer(
    studentId: number,
    exerciseId: number,
    databaseId: number,
  ): Promise<DockerContainer> {
    const sessionId = randomUUID();
    const port = await this.findAvailablePort();

    if (!port) {
      throw new Error('No available ports for new container');
    }

    const containerName = `sql-exercise-${studentId}-${exerciseId}-${sessionId}`;

    // Create container record
    const container: DockerContainer = {
      id: sessionId,
      studentId,
      exerciseId,
      databaseId,
      containerId: '', // Will be set when container starts
      port,
      createdAt: new Date(),
      status: 'starting',
    };

    // Store container info
    this.containers.set(sessionId, container);
    this.usedPorts.add(port);

    try {
      // Start the container using Docker command
      const containerId = await this.startPostgresContainer(
        containerName,
        port,
      );

      // Update container with ID
      container.containerId = containerId;
      container.status = 'running';
      this.containers.set(sessionId, container);

      // Initialize database schema
      await this.initializeDatabase(container, databaseId);

      return container;
    } catch (error) {
      // Clean up on error
      this.containers.delete(sessionId);
      this.usedPorts.delete(port);
      this.logger.error(`Failed to create container: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get container by session ID
   */
  getContainer(sessionId: string): DockerContainer | undefined {
    return this.containers.get(sessionId);
  }

  /**
   * Get active container for a student-exercise pair if exists
   */
  getActiveContainerForStudent(
    studentId: number,
    exerciseId: number,
  ): DockerContainer | undefined {
    for (const container of this.containers.values()) {
      if (
        container.studentId === studentId &&
        container.exerciseId === exerciseId &&
        container.status === 'running'
      ) {
        return container;
      }
    }
    return undefined;
  }

  /**
   * Stop and remove a container
   */
  async stopContainer(sessionId: string): Promise<boolean> {
    const container = this.containers.get(sessionId);

    if (!container) {
      return false;
    }

    try {
      if (container.containerId) {
        await this.executeCommand('docker', ['stop', container.containerId]);
        await this.executeCommand('docker', ['rm', container.containerId]);
      }

      this.containers.delete(sessionId);
      this.usedPorts.delete(container.port);

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to stop container ${sessionId}: ${error.message}`,
      );
      container.status = 'error';
      this.containers.set(sessionId, container);
      return false;
    }
  }

  /**
   * Get database connection string for a container
   */
  getConnectionString(sessionId: string): string {
    const container = this.containers.get(sessionId);

    if (!container || container.status !== 'running') {
      throw new Error('Container not available');
    }

    return `postgresql://postgres:postgres@localhost:${container.port}/postgres`;
  }

  /**
   * Find available port for new container
   */
  private async findAvailablePort(): Promise<number> {
    // Get list of ports already in use by running containers
    const { stdout } = await this.executeCommand('docker', [
      'ps',
      '--format',
      '{{.Ports}}',
    ]);
    const usedPorts = new Set<number>();
    const portRegex = /:(\d+)->/g;
    let match;
    while ((match = portRegex.exec(stdout)) !== null) {
      usedPorts.add(parseInt(match[1], 10));
    }

    // Find a free port in the range
    for (
      let port = this.PORT_RANGE_START;
      port <= this.PORT_RANGE_END;
      port++
    ) {
      if (!this.usedPorts.has(port) && !usedPorts.has(port)) {
        return port;
      }
    }
    return 0; // No available ports
  }

  /**
   * Start a PostgreSQL container
   */
  private async startPostgresContainer(
    name: string,
    port: number,
  ): Promise<string> {
    const args = [
      'run',
      '-d',
      '--name',
      name,
      '-e',
      'POSTGRES_PASSWORD=postgres',
      '-e',
      'POSTGRES_USER=postgres',
      '-p',
      `${port}:5432`,
      'postgres:15',
    ];

    const { stdout } = await this.executeCommand('docker', args);
    const containerId = stdout.trim();

    // Log the port mapping
    this.logger.log(
      `Container ${name} started with port mapping: ${port}:5432`,
    );

    // Wait a bit for the container to initialize
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Wait for PostgreSQL to be ready
    await this.waitForPostgres(port);

    return containerId;
  }

  /**
   * Initialize the database with schema and seed data
   */
  private async initializeDatabase(
    container: DockerContainer,
    databaseId: number,
  ): Promise<void> {
    try {
      // Get the database schema and seed data from Prisma
      const database = await this.prisma.database.findUnique({
        where: { id: databaseId },
      });

      if (!database) {
        throw new Error(`Database with ID ${databaseId} not found`);
      }

      this.logger.log(
        `Initializing database for container ${container.id} with database schema from ID ${databaseId}`,
      );

      // Create a connection to the container database
      // Here we use "pg" to connect directly
      const client = new Client({
        host: 'localhost',
        port: container.port,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
      });

      // Connect to the database
      await client.connect();

      try {
        // Execute schema and seed data
        if (database.schema && database.schema.trim()) {
          this.logger.log(`Executing schema on container ${container.id}`);
          await client.query(database.schema);
        }

        if (database.seedData && database.seedData.trim()) {
          this.logger.log(`Executing seed data on container ${container.id}`);
          await client.query(database.seedData);
        }
      } finally {
        await client.end();
      }
    } catch (error) {
      this.logger.error(`Error initializing database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for PostgreSQL to be ready
   */
  private async waitForPostgres(port: number): Promise<void> {
    const maxRetries = 60;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const { stdout, stderr } = await this.executeCommand('pg_isready', [
          '-h',
          'localhost',
          '-p',
          port.toString(),
        ]);
        this.logger.log(`pg_isready output: ${stdout} ${stderr}`);
        return;
      } catch (error) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`PostgreSQL not ready after ${maxRetries} attempts`);
  }

  /**
   * Execute a command and return stdout
   */
  private executeCommand(
    command: string,
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (error) => {
        reject(error);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Stop and remove a container
   */
  private async stopAndRemoveContainer(sessionId: string): Promise<void> {
    const container = this.containers.get(sessionId);

    if (container) {
      try {
        if (container.containerId) {
          await this.executeCommand('docker', ['stop', container.containerId]);
          await this.executeCommand('docker', ['rm', container.containerId]);
        }
      } catch (error) {
        this.logger.error(
          `Failed to stop and remove container ${sessionId}: ${error.message}`,
        );
      } finally {
        this.containers.delete(sessionId);
        this.usedPorts.delete(container.port);
      }
    }
  }
}
