/**
 * Service for handling database schema parsing and management
 */
import { Injectable } from '@angular/core';
import { SqlImportService } from '../services/sql-import.service';
import { TableDataService } from './table-data.service';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface DatabaseTable {
  tableName: string;
  columns: TableColumn[];
}

export interface TableColumn {
  name: string;
  type: string;
  constraints?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseSchemaService {
  private schemaCache: Record<number, {schema: string, seedData?: string}> = {};

  constructor(
    private sqlImportService: SqlImportService,
    private tableDataService: TableDataService
  ) {}

  /**
   * Load database schema with caching
   */
  loadDatabaseSchema(databaseId: number): Observable<{tables: DatabaseTable[], seedData?: string}> {
    // Check cache first
    if (this.schemaCache[databaseId]) {
      const cached = this.schemaCache[databaseId];
      const tables = this.parseDatabaseSchema(cached.schema);
      return of({ tables, seedData: cached.seedData });
    }

    return this.sqlImportService.getDatabase(databaseId).pipe(
      tap(database => {
        if (database && database.schema) {
          // Cache the result
          this.schemaCache[databaseId] = {
            schema: database.schema,
            seedData: database.seedData
          };

          // Process seed data in the TableDataService
          if (database.seedData) {
            this.tableDataService.processSeedData(database.seedData);
          }
        }
      }),
      map(database => {
        if (database && database.schema) {
          const tables = this.parseDatabaseSchema(database.schema);
          return { tables, seedData: database.seedData };
        }
        return { tables: [] };
      }),
      catchError(error => {
        console.error('Error loading database schema:', error);
        return of({ tables: [] });
      })
    );
  }

  /**
   * Parse database schema from SQL CREATE statements
   */
  parseDatabaseSchema(schema: string): DatabaseTable[] {
    const tables: DatabaseTable[] = [];
    
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
    let match;
    
    while ((match = tableRegex.exec(schema)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];
      
      const columns = this.parseColumns(tableDefinition);
      
      tables.push({
        tableName,
        columns
      });
    }
    
    return tables;
  }

  /**
   * Parse column definitions from table definition
   */
  private parseColumns(tableDefinition: string): TableColumn[] {
    const columns: TableColumn[] = [];
    
    const columnLines = this.splitDefinitionLines(tableDefinition);
    
    columnLines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('PRIMARY KEY') || trimmedLine.startsWith('FOREIGN KEY')) {
        return;
      }
      
      const matches = trimmedLine.match(/^["']?(\w+)["']?\s+([A-Za-z0-9\(\)]+)(.*)$/i);
      if (matches) {
        const name = matches[1];
        const type = matches[2];
        const constraints = matches[3] ? matches[3].trim() : '';
        
        columns.push({
          name,
          type,
          constraints
        });
      }
    });
    
    return columns;
  }

  /**
   * Split table definition into individual column lines
   */
  private splitDefinitionLines(definition: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inParentheses = 0;
    
    for (let i = 0; i < definition.length; i++) {
      const char = definition[i];
      
      if (char === '(') {
        inParentheses++;
        currentLine += char;
      } else if (char === ')') {
        inParentheses--;
        currentLine += char;
      } else if (char === ',' && inParentheses === 0) {
        lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache = {};
  }
}
