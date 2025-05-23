import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpEvent } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Define interfaces for data types
interface SqlImport {
  id: number;
  name: string;
  schema: string;
  seedData?: string;
  authorId?: number;
  author?: {
    name: string;
  };
  createdAt?: Date;
  warnings?: string[];
}

interface SqlQueryResult {
  results: any[];
  message?: string;
  warnings?: string[];
}

interface UploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'complete' | 'error';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SqlImportService {
  private apiUrl = environment.apiUrl + '/sql-import';
  private databaseCache = new Map<number, Observable<SqlImport>>();
  private databasesCache: Observable<SqlImport[]> | null = null;
  private queryCache = new Map<string, any>();
  private uploadProgress = new BehaviorSubject<UploadProgress>({ 
    progress: 0, 
    status: 'idle' 
  });

  constructor(
    private http: HttpClient,
  ) {}

  /**
   * Get upload progress observable
   */
  getUploadProgress(): Observable<UploadProgress> {
    return this.uploadProgress.asObservable();
  }

  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse, contextMessage: string): Observable<never> {
    let errorMessage = `${contextMessage}: `;
    
    // Extract error details
    if (error.status === 0) {
      errorMessage += 'Network error. Please check your internet connection.';
    } else if (error.status === 400) {
      if (error.error?.code === 'VALIDATION_ERROR') {
        errorMessage += error.error.message || 'SQL validation failed';
      } else if (error.error?.code === 'DUPLICATE_DATA') {
        errorMessage += error.error.message;
        if (error.error.detail) {
          errorMessage += `\nDetails: ${error.error.detail}`;
        }
      } else if (error.error?.code === 'EXECUTION_ERROR') {
        errorMessage += error.error.message || 'Failed to execute SQL statements';
      } else {
        errorMessage += error.error?.message || 'Invalid SQL syntax or request';
      }
    } else if (error.status === 404) {
      errorMessage += 'The requested database was not found.';
    } else if (error.status === 403) {
      errorMessage += 'You do not have permission to access this resource.';
    } else if (error.error?.message) {
      errorMessage += error.error.message;
    } else {
      errorMessage += 'An unknown error occurred.';
    }
    
    // If there are any warnings, add them to the error message
    if (error.error?.warnings?.length > 0) {
      errorMessage += '\n\nWarnings:\n' + error.error.warnings.join('\n');
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Upload a database file with progress tracking
   */
  uploadDatabase(file: File, name?: string): Observable<HttpEvent<SqlImport>> {
    console.log('Starting database upload:', file.name, 'Size:', file.size, 'bytes');
    const formData = new FormData();
    formData.append('file', file);
    
    if (name) {
      formData.append('name', name);
      console.log('Using custom database name:', name);
    }
    
    // Reset progress
    this.uploadProgress.next({ progress: 0, status: 'uploading' });
    
    // Determine file type from content and extension
    const isPostgreSQL = file.name.toLowerCase().includes('postgres') || 
                        file.name.toLowerCase().includes('pg');
    console.log(`File appears to be ${isPostgreSQL ? 'PostgreSQL' : 'MySQL/Other'} format`);
    
    return this.http.post<SqlImport>(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
    }).pipe(
      map(event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            console.log(`Upload progress: ${progress}%`);
            this.uploadProgress.next({
              progress,
              status: 'uploading',
              message: `Uploading: ${progress}%`
            });
            return event;
            
          case HttpEventType.Response:
            console.log('Upload complete, server response:', event.body);
            const response = event.body as SqlImport;
            let message = 'SQL-Datei erfolgreich hochgeladen';
            if (response?.warnings && response.warnings.length > 0) {
              message += ' (mit Warnungen)';
            }
            this.uploadProgress.next({
              progress: 100,
              status: 'complete',
              message
            });
            // Force cache invalidation to ensure fresh data is loaded
            this.invalidateCache();
            return event;
            
          default:
            return event;
        }
      }),
      catchError(error => {
        console.error('Upload failed:', error);
        // Detailed error logging
        if (error?.error?.message) {
          console.error('Server error message:', error.error.message);
        }
        if (error?.status) {
          console.error('HTTP Status:', error.status);
        }
        
        this.uploadProgress.next({
          progress: 0,
          status: 'error',
          message: error.error?.message || 'Upload failed'
        });

        // Pass through to handleError
        return this.handleError(error, 'Failed to upload database');
      }),
      finalize(() => {
        console.log('Upload operation finalized');
        // Reset status after 5 seconds if complete
        if (this.uploadProgress.value.status === 'complete') {
          setTimeout(() => {
            this.uploadProgress.next({ progress: 0, status: 'idle' });
          }, 5000);
        }
      })
    );
  }

  /**
   * Get all available databases
   */
  getDatabases(): Observable<SqlImport[]> {
    if (this.databasesCache) {
      return this.databasesCache;
    }

    this.databasesCache = this.http.get<SqlImport[]>(`${this.apiUrl}/databases`).pipe(
      map(databases => {
        console.log('Fetched databases:', databases);
        return databases;
      }),
      shareReplay(1),
      catchError(error => this.handleError(error, 'Failed to fetch databases'))
    );

    return this.databasesCache;
  }

  /**
   * Get a specific database by ID
   */
  getDatabase(id: number): Observable<SqlImport> {
    if (this.databaseCache.has(id)) {
      return this.databaseCache.get(id)!;
    }

    const request = this.http.get<SqlImport>(`${this.apiUrl}/databases/${id}`).pipe(
      shareReplay(1),
      catchError(error => this.handleError(error, `Failed to fetch database with ID ${id}`))
    );

    this.databaseCache.set(id, request);
    return request;
  }

  /**
   * Update an existing database
   */
  updateDatabase(id: number, database: Partial<SqlImport>, sqlFile?: File): Observable<SqlImport> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    
    return this.http.patch<SqlImport>(`${this.apiUrl}/databases/${id}`, formData).pipe(
      tap(() => {
        // Invalidate specific cache entries
        this.databaseCache.delete(id);
        this.databasesCache = null;
        // Invalidate any query results for this database
        this.invalidateQueryCache(id);
      }),
      catchError(error => this.handleError(error, `Failed to update database with ID ${id}`))
    );
  }

  /**
   * Delete a database
   */
  deleteDatabase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/databases/${id}`).pipe(
      tap(() => {
        // Invalidate specific cache entries
        this.databaseCache.delete(id);
        this.databasesCache = null;
        // Invalidate any query results for this database
        this.invalidateQueryCache(id);
      }),
      catchError(error => this.handleError(error, `Failed to delete database with ID ${id}`))
    );
  }

  /**
   * Execute SQL query on a database
   */
  executeQuery(databaseId: number, query: string): Observable<any> {
    const cacheKey = `${databaseId}:${query}`;
    if (this.queryCache.has(cacheKey)) {
      return of(this.queryCache.get(cacheKey));
    }

    return this.http.post<any>(`${this.apiUrl}/databases/${databaseId}/execute`, { query }).pipe(
      tap(result => {
        // Cache successful query results
        this.queryCache.set(cacheKey, result);
      }),
      catchError(error => this.handleError(error, 'Failed to execute query'))
    );
  }

  /**
   * Force refresh the databases
   */
  refreshDatabases(): Observable<SqlImport[]> {
    this.invalidateCache();
    return this.getDatabases();
  }

  /**
   * Invalidate the cache
   */
  invalidateCache(): void {
    this.databasesCache = null;
    this.databaseCache.clear();
    this.queryCache.clear();
  }

  /**
   * Clear cache entries for a specific database
   */
  invalidateDatabaseCache(databaseId: number): void {
    this.databaseCache.delete(databaseId);
    // Also clear any query results that might be related to this database
    this.invalidateQueryCache(databaseId);
  }

  /**
   * Clear query cache for a database
   */
  private invalidateQueryCache(databaseId: number): void {
    this.queryCache.clear(); // Simple implementation - clear all cached queries
  }
}

export default SqlImportService;
