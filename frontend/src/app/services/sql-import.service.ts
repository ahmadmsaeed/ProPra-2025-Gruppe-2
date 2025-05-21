import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { map, catchError, shareReplay, tap, retry, timeout, finalize } from 'rxjs/operators';
import SqlImport from '../models/sql-import.model';
import { environment } from '../../environments/environment';

export interface QueryExecutionRequest {
  databaseId: number;
  query: string;
  executionId?: string;
}

export interface UploadProgressInfo {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SqlImportService {
  private apiUrl = `${environment.apiUrl}/sql-import`;
  
  // Cache for database schema data
  private databasesCache: Observable<SqlImport[]> | null = null;
  private databaseCache: Map<number, Observable<SqlImport>> = new Map();
  private queryResultCache: Map<string, any[]> = new Map();
  
  // Track upload progress
  private uploadProgress = new BehaviorSubject<UploadProgressInfo>({ 
    progress: 0, 
    status: 'idle' 
  });
  uploadProgress$ = this.uploadProgress.asObservable();

  constructor(private http: HttpClient) {}
    /**
   * Get all databases with caching
   */
  getDatabases(): Observable<SqlImport[]> {
    if (this.databasesCache) {
      console.log('Returning databases from cache');
      return this.databasesCache;
    }
    
    console.log('Fetching databases from server');
    this.databasesCache = this.http.get<SqlImport[]>(`${this.apiUrl}/databases`).pipe(
      retry(2),
      timeout(30000),
      tap(databases => console.log(`Fetched ${databases.length} databases from server`)),
      shareReplay(1),
      catchError(error => this.handleError(error, 'Failed to load databases'))
    );
    
    return this.databasesCache;
  }

  /**
   * Get a specific database by ID with caching
   */
  getDatabase(id: number): Observable<SqlImport> {
    if (this.databaseCache.has(id)) {
      return this.databaseCache.get(id)!;
    }
    
    const request = this.http.get<SqlImport>(`${this.apiUrl}/databases/${id}`).pipe(
      retry(2),
      timeout(30000),
      shareReplay(1),
      catchError(error => this.handleError(error, `Failed to load database with ID ${id}`))
    );
    
    this.databaseCache.set(id, request);
    return request;
  }

  /**
   * Create a new database
   */
  createDatabase(database: Partial<SqlImport>, sqlFile: File): Observable<SqlImport> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    formData.append('sqlFile', sqlFile);
    
    return this.http.post<SqlImport>(`${this.apiUrl}/databases`, formData).pipe(
      tap(() => {
        this.invalidateCache();
      }),
      catchError(error => this.handleError(error, 'Failed to create database'))
    );
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
    console.log(`Calling API to delete database with ID: ${id}`);
    return this.http.delete<void>(`${this.apiUrl}/databases/${id}`).pipe(
      tap(() => {
        console.log(`Database with ID ${id} successfully deleted on the server`);
        // Clear all caches to ensure fresh data
        this.invalidateCache();
        this.invalidateQueryCache(id);
      }),
      catchError(error => {
        console.error(`Error deleting database with ID ${id}:`, error);
        return this.handleError(error, `Failed to delete database with ID ${id}`);
      })
    );
  }
    /**
   * Upload a database file with progress tracking
   */
  uploadDatabase(file: File, name?: string): Observable<any> {
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
    
    return this.http.post(`${this.apiUrl}/upload`, formData, {
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
            this.uploadProgress.next({
              progress: 100,
              status: 'complete',
              message: 'Upload complete!'
            });
            // Force cache invalidation to ensure fresh data is loaded
            this.invalidateCache();
            
            // Return the response to subscribers
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
   * Execute a SQL query with optional caching
   */
  executeQuery(databaseId: number, query: string, useCache: boolean = true): Observable<any> {
    // Generate a cache key based on the database ID and query
    const cacheKey = `${databaseId}-${query}`;
    
    // For SELECT queries, we can use caching if requested
    const isSelectQuery = query.trim().toUpperCase().startsWith('SELECT');
    
    if (useCache && isSelectQuery && this.queryResultCache.has(cacheKey)) {
      return new Observable(observer => {
        observer.next(this.queryResultCache.get(cacheKey));
        observer.complete();
      });
    }
    
    return this.http.post(`${this.apiUrl}/query`, { databaseId, query }).pipe(
      retry(isSelectQuery ? 2 : 0), // Only retry SELECT queries
      timeout(60000), // Longer timeout for complex queries
      tap(result => {
        // Cache SELECT query results
        if (isSelectQuery && Array.isArray(result)) {
          this.queryResultCache.set(cacheKey, result);
        }
      }),
      catchError(error => this.handleError(error, 'Failed to execute query'))
    );
  }
  
  /**
   * Execute multiple queries in batch (as transaction if supported)
   */
  executeBatch(databaseId: number, queries: string[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/batch`, { 
      databaseId, 
      queries, 
      useTransaction: true 
    }).pipe(
      catchError(error => this.handleError(error, 'Failed to execute batch queries'))
    );
  }
    /**
   * Invalidate all caches
   */
  invalidateCache(): void {
    console.log('Invalidating all database caches');
    this.databasesCache = null;
    this.databaseCache.clear();
  }
  
  /**
   * Invalidate query cache for a specific database
   */
  invalidateQueryCache(databaseId: number): void {
    const prefix = `${databaseId}-`;
    // Remove all cached queries for this database
    Array.from(this.queryResultCache.keys())
      .filter(key => key.startsWith(prefix))
      .forEach(key => this.queryResultCache.delete(key));
  }
  /**
   * Refresh databases by forcing a new request
   */
  refreshDatabases(): Observable<SqlImport[]> {
    console.log('Forcing database refresh from server');
    // Clear the cache first
    this.invalidateCache();
    
    // Add a random query parameter to prevent browser caching
    const cacheBuster = `?t=${Date.now()}`;
    
    // Return a fresh database request
    return this.http.get<SqlImport[]>(`${this.apiUrl}/databases${cacheBuster}`).pipe(
      retry(3), // Try up to 3 times before failing
      timeout(30000),
      tap(databases => {
        console.log(`Refreshed ${databases.length} databases from server`);
        // Verify database IDs for debugging
        if (databases.length > 0) {
          console.log('Database IDs:', databases.map(db => db.id).join(', '));
        }
        // Cache the result
        this.databasesCache = of(databases).pipe(shareReplay(1));
      }),
      catchError(error => {
        console.error('Failed to refresh databases:', error);
        // Try to recover the cache if possible
        if (!this.databasesCache) {
          console.log('Attempting to get databases without cache busting...');
          this.databasesCache = this.http.get<SqlImport[]>(`${this.apiUrl}/databases`).pipe(
            shareReplay(1)
          );
        }
        return this.handleError(error, 'Failed to refresh databases');
      })
    );
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse, contextMessage: string): Observable<never> {
    let errorMessage = `${contextMessage}: `;
    
    if (error.status === 0) {
      errorMessage += 'Network error. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage += error.error?.message || 'Invalid SQL syntax or request';
    } else if (error.status === 404) {
      errorMessage += 'The requested database was not found.';
    } else if (error.status === 403) {
      errorMessage += 'You do not have permission to access this resource.';
    } else if (error.error?.message) {
      errorMessage += error.error.message;
    } else {
      errorMessage += 'An unknown error occurred.';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}

export default SqlImportService;
