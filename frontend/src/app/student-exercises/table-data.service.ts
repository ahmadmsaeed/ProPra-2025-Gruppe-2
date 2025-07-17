/**
 * Service for handling table data loading and caching
 */
import { Injectable } from '@angular/core';
import { SqlImportService } from '../services/sql-import.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface TableDataResult {
  data: any[];
  columns: string[];
  seedData: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TableDataService {
  private tableDataCache = new Map<string, any[]>();
  private tableSeedDataMap: Record<string, string[]> = {};

  constructor(private sqlImportService: SqlImportService) {}

  /**
   * Load table data with caching
   */
  loadTableData(databaseId: number, tableName: string): Observable<TableDataResult> {
    const cacheKey = `${databaseId}-${tableName}`;
    
    // Check cache first
    if (this.tableDataCache.has(cacheKey)) {
      const cachedData = this.tableDataCache.get(cacheKey) || [];
      const columns = cachedData.length > 0 ? Object.keys(cachedData[0]) : [];
      const seedData = this.findSeedDataForTable(tableName);
      
      return of({ data: cachedData, columns, seedData });
    }

    // Use proper SQL identifier quoting to handle edge cases
    const query = `SELECT * FROM "${tableName}"`;
    return this.sqlImportService.executeQuery(databaseId, query, true).pipe(
      map((result: any) => {
        let data: any[] = [];
        let columns: string[] = [];

        if (Array.isArray(result) && result.length > 0) {
          data = result;
          columns = Object.keys(result[0]);
          // Cache the result
          this.tableDataCache.set(cacheKey, result);
        } else if (Array.isArray(result)) {
          // Empty result set is still valid
          data = [];
          columns = [];
          this.tableDataCache.set(cacheKey, []);
        }

        const seedData = this.findSeedDataForTable(tableName);
        return { data, columns, seedData };
      }),
      catchError(error => {
        console.error(`Error loading table data for ${tableName}:`, error);
        
        // Try without quotes in case the table name has different casing
        const fallbackQuery = `SELECT * FROM ${tableName}`;
        return this.sqlImportService.executeQuery(databaseId, fallbackQuery, true).pipe(
          map((result: any) => {
            let data: any[] = [];
            let columns: string[] = [];

            if (Array.isArray(result) && result.length > 0) {
              data = result;
              columns = Object.keys(result[0]);
              this.tableDataCache.set(cacheKey, result);
            } else if (Array.isArray(result)) {
              data = [];
              columns = [];
              this.tableDataCache.set(cacheKey, []);
            }

            const seedData = this.findSeedDataForTable(tableName);
            return { data, columns, seedData };
          }),
          catchError(fallbackError => {
            console.error(`Fallback query also failed for ${tableName}:`, fallbackError);
            return of({ data: [], columns: [], seedData: [] });
          })
        );
      })
    );
  }

  /**
   * Process seed data from SQL statements
   */
  processSeedData(seedData: string): void {
    // Split SQL statements and filter for INSERT statements
    const statements = seedData.split(';').filter(s => s.trim().length > 0);
    
    // Mapping from table name to array of INSERT statements
    const tableSeedMap: Record<string, string[]> = {};
    
    // Process each statement
    statements.forEach(statement => {
      const trimmed = statement.trim();
      if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
        // Extract table name
        const tableNameMatch = trimmed.match(/INSERT\s+INTO\s+(?:["'])?(\w+)(?:["'])?/i);
        if (tableNameMatch && tableNameMatch[1]) {
          const tableName = tableNameMatch[1];
          
          if (!tableSeedMap[tableName]) {
            tableSeedMap[tableName] = [];
          }
          
          tableSeedMap[tableName].push(trimmed);
        }
      }
    });
    
    this.tableSeedDataMap = tableSeedMap;
  }

  /**
   * Get seed data for a specific table
   */
  getSeedDataForTable(tableName: string): string[] {
    return this.findSeedDataForTable(tableName);
  }

  /**
   * Find seed data for a specific table
   */
  private findSeedDataForTable(tableName: string): string[] {
    return this.tableSeedDataMap[tableName] || [];
  }

  /**
   * Clear table data cache
   */
  clearCache(): void {
    this.tableDataCache.clear();
    this.tableSeedDataMap = {};
  }

  /**
   * Clear cache for specific database
   */
  clearDatabaseCache(databaseId: number): void {
    const keysToDelete: string[] = [];
    this.tableDataCache.forEach((_, key) => {
      if (key.startsWith(`${databaseId}-`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.tableDataCache.delete(key);
    });
  }
}
