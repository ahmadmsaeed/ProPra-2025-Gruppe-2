export interface DatabaseCreateData {
  name: string;
  schema: string;
  seedData: string;
  authorId?: number;
}

export interface DatabaseUpdateData {
  name?: string;
  schema?: string;
  seedData?: string;
}

export interface DatabaseRequestBody {
  database?: string | DatabaseUpdateData;
  name?: string;
  schema?: string;
  seedData?: string;
}

export interface TableInfo {
  tableNames: string[];
  tableCount: number;
}

export interface DatabaseInfo {
  id: number;
  name: string;
}

export interface DatabaseQueryResult {
  name: string;
  id: number;
  schema: string;
}
