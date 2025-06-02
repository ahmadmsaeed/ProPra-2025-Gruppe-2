import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, shareReplay, tap, retry, timeout, map, finalize } from 'rxjs/operators';
import { Database } from '@app/models/database.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = `${environment.apiUrl}/sql-import/databases`;
  
  // Cache for frequently accessed data
  private databasesCache: Observable<Database[]> | null = null;
  private databaseCache: Map<number, Observable<Database>> = new Map();
  
  // Track request states
  private pendingRequests = new Map<string, boolean>();

  constructor(private http: HttpClient) {}

  /**
   * Get all databases with caching
   */
  getDatabases(): Observable<Database[]> {
    // Return cached response if available
    if (this.databasesCache) {
      return this.databasesCache;
    }
    
    // Set request as pending
    this.pendingRequests.set('getDatabases', true);
    
    // Create a new request and cache it
    this.databasesCache = this.http.get<Database[]>(this.apiUrl).pipe(
      retry(2), // Retry failed requests up to 2 times
      timeout(30000), // Set a 30 second timeout
      tap(() => {
        // Mark request as complete
        this.pendingRequests.delete('getDatabases');
      }),
      shareReplay(1), // Cache the response
      catchError(error => this.handleError(error, 'Failed to load databases')),
      finalize(() => {
        // Ensure request is marked as complete even on error
        this.pendingRequests.delete('getDatabases');
      })
    );
    
    return this.databasesCache;
  }

  /**
   * Get a specific database by ID with caching
   */
  getDatabase(id: number): Observable<Database> {
    // Return cached response if available
    if (this.databaseCache.has(id)) {
      return this.databaseCache.get(id)!;
    }
    
    const requestKey = `getDatabase-${id}`;
    this.pendingRequests.set(requestKey, true);
    
    // Create a new request and cache it
    const request = this.http.get<Database>(`${this.apiUrl}/${id}`).pipe(
      retry(2),
      timeout(30000),
      tap(() => {
        this.pendingRequests.delete(requestKey);
      }),
      shareReplay(1),
      catchError(error => this.handleError(error, `Failed to load database with ID ${id}`)),
      finalize(() => {
        this.pendingRequests.delete(requestKey);
      })
    );
    
    this.databaseCache.set(id, request);
    return request;
  }

  /**
   * Create a new database
   */
  createDatabase(database: Partial<Database>, sqlFile: File): Observable<Database> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    formData.append('sqlFile', sqlFile);
    
    return this.http.post<Database>(this.apiUrl, formData).pipe(
      tap(newDatabase => {
        // Invalidate cache after creating a new database
        this.invalidateCache();
      }),
      catchError(error => this.handleError(error, 'Failed to create database'))
    );
  }

  /**
   * Update an existing database
   */
  updateDatabase(id: number, database: Partial<Database>, sqlFile?: File): Observable<Database> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    
    return this.http.patch<Database>(`${this.apiUrl}/${id}`, formData).pipe(
      tap(updatedDatabase => {
        // Invalidate specific cache entries after an update
        this.databaseCache.delete(id);
        this.databasesCache = null;
      }),
      catchError(error => this.handleError(error, `Failed to update database with ID ${id}`))
    );
  }

  /**
   * Delete a database
   */
  deleteDatabase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Invalidate cache after deleting a database
        this.invalidateCache();
      }),
      catchError(error => this.handleError(error, `Failed to delete database with ID ${id}`))
    );
  }
  
  /**
   * Invalidate the entire cache
   */
  invalidateCache(): void {
    this.databasesCache = null;
    this.databaseCache.clear();
  }
  
  /**
   * Check if a request is pending
   */
  isRequestPending(key: string): boolean {
    return this.pendingRequests.get(key) || false;
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse, contextMessage: string): Observable<never> {
    let errorMessage = `${contextMessage}: `;
    
    if (error.status === 0) {
      errorMessage += 'Network error. Please check your internet connection.';
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

export default DatabaseService; 