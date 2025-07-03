/**
 * Service for handling query execution and management
 */
import { Injectable } from '@angular/core';
import { SqlImportService } from '../services/sql-import.service';
import { Observable, throwError } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';

export interface QueryResult {
  data: any[];
  columns: string[];
  executionTime: number;
  hasError: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QueryExecutionService {

  constructor(private sqlImportService: SqlImportService) {}

  /**
   * Execute a SQL query and return formatted results
   */
  executeQuery(databaseId: number, query: string, isPreview: boolean = false): Observable<QueryResult> {
    const startTime = performance.now();
    
    return this.sqlImportService.executeQuery(databaseId, query, false).pipe(
      map((result: any) => {
        const endTime = performance.now();
        const executionTime = Math.round(endTime - startTime);
        
        let data: any[] = [];
        let columns: string[] = [];
        
        if (Array.isArray(result)) {
          data = result;
          columns = result.length > 0 ? Object.keys(result[0]) : [];
        }
        
        return {
          data,
          columns,
          executionTime,
          hasError: false
        };
      }),
      catchError(error => {
        const endTime = performance.now();
        const executionTime = Math.round(endTime - startTime);
        
        return throwError(() => ({
          data: [],
          columns: [],
          executionTime,
          hasError: true,
          errorMessage: error.error?.message || error.message || 'Unknown error'
        }));
      })
    );
  }

  /**
   * Validate SQL query syntax without executing
   */
  validateQuery(query: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic SQL validation
    if (!query.trim()) {
      errors.push('Query cannot be empty');
    }
    
    // Check for basic SQL keywords
    const upperQuery = query.toUpperCase().trim();
    const validStarters = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    const startsWithValidKeyword = validStarters.some(keyword => upperQuery.startsWith(keyword));
    
    if (!startsWithValidKeyword) {
      errors.push('Query must start with a valid SQL keyword');
    }
    
    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of query) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) {
        errors.push('Unbalanced parentheses');
        break;
      }
    }
    
    if (parenthesesCount > 0) {
      errors.push('Unclosed parentheses');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format query result for display
   */
  formatQueryResult(result: any): { data: any[], columns: string[] } {
    if (Array.isArray(result)) {
      return {
        data: result,
        columns: result.length > 0 ? Object.keys(result[0]) : []
      };
    }
    
    return { data: [], columns: [] };
  }

  /**
   * Get query suggestions based on common patterns
   */
  getQuerySuggestions(partialQuery: string): string[] {
    const suggestions: string[] = [];
    const upperQuery = partialQuery.toUpperCase().trim();
    
    if (upperQuery.startsWith('SELECT')) {
      if (!upperQuery.includes('FROM')) {
        suggestions.push('Add FROM clause');
      }
      if (!upperQuery.includes('WHERE') && upperQuery.includes('FROM')) {
        suggestions.push('Consider adding WHERE clause for filtering');
      }
    }
    
    if (upperQuery.includes('JOIN') && !upperQuery.includes('ON')) {
      suggestions.push('Add ON clause for JOIN condition');
    }
    
    return suggestions;
  }
}
