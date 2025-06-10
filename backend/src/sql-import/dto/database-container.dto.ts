export interface DatabaseContainerInfo {
  containerId: string;
  databaseName: string;
  port: number;
  studentId: number;
  originalDatabaseId: number;
  createdAt: Date;
  status: 'creating' | 'ready' | 'error' | 'cleanup';
}

export interface ContainerConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
