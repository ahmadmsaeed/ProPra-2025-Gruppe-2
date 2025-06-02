import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, shareReplay, tap, retry, timeout } from 'rxjs/operators';
import { Exercise } from '../models/exercise.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private apiUrl = `${environment.apiUrl}/exercises`;
  
  // Cache for frequently accessed data
  private exercisesCache: Observable<Exercise[]> | null = null;
  private exerciseCache: Map<number, Observable<Exercise>> = new Map();
  
  constructor(private http: HttpClient) {}

  /**
   * Get all exercises with caching
   */
  getExercises(): Observable<Exercise[]> {
    // Return cached response if available
    if (this.exercisesCache) {
      return this.exercisesCache;
    }
    
    // Create a new request and cache it
    this.exercisesCache = this.http.get<Exercise[]>(this.apiUrl).pipe(
      retry(2), // Retry failed requests up to 2 times
      timeout(30000), // Set a 30 second timeout
      tap((exercises) => {
        console.log('Fetched exercises from API:', exercises);
        // Debug: Log database IDs to track the source of IDs 5 and 6
        exercises.forEach(exercise => {
          console.log(`Exercise "${exercise.title}" uses database ID: ${exercise.databaseSchemaId}`);
        });
      }),
      shareReplay(1), // Cache the response for future subscribers
      catchError(this.handleError)
    );
    
    return this.exercisesCache;
  }

  /**
   * Force refresh exercises by clearing cache and fetching fresh data
   */
  refreshExercises(): Observable<Exercise[]> {
    this.invalidateCache();
    return this.getExercises();
  }

  /**
   * Get a specific exercise by ID with caching
   */
  getExercise(id: number): Observable<Exercise> {
    // Return cached response if available
    if (this.exerciseCache.has(id)) {
      return this.exerciseCache.get(id)!;
    }
    
    // Create a new request and cache it
    const request = this.http.get<Exercise>(`${this.apiUrl}/${id}`).pipe(
      retry(2),
      timeout(30000),
      tap(() => console.log(`Fetched exercise with ID ${id} from API`)),
      shareReplay(1),
      catchError(this.handleError)
    );
    
    this.exerciseCache.set(id, request);
    return request;
  }

  /**
   * Create a new exercise
   */
  createExercise(exercise: Partial<Exercise>, sqlFile?: File): Observable<Exercise> {
    const formData = new FormData();
    formData.append('exercise', JSON.stringify(exercise));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    
    return this.http.post<Exercise>(this.apiUrl, formData).pipe(
      tap(newExercise => {
        // Invalidate cache after creating a new exercise
        this.invalidateCache();
        console.log('Created new exercise:', newExercise);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing exercise
   */
  updateExercise(id: number, exercise: Partial<Exercise>, sqlFile?: File): Observable<Exercise> {
    const formData = new FormData();
    formData.append('exercise', JSON.stringify(exercise));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    
    return this.http.patch<Exercise>(`${this.apiUrl}/${id}`, formData).pipe(
      tap(updatedExercise => {
        // Invalidate specific cache entries after an update
        this.exerciseCache.delete(id);
        this.exercisesCache = null;
        console.log('Updated exercise:', updatedExercise);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete an exercise
   */
  deleteExercise(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Invalidate cache after deleting an exercise
        this.invalidateCache();
        console.log(`Deleted exercise with ID: ${id}`);
      }),
      catchError(this.handleError)
    );
  }
  
  /**
   * Invalidate the entire cache
   */
  invalidateCache(): void {
    this.exercisesCache = null;
    this.exerciseCache.clear();
    console.log('Exercise cache invalidated');
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Exercise API error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.status === 0) {
      errorMessage = 'Connection error. Please check your internet connection.';
    } else if (error.status === 404) {
      errorMessage = 'The requested exercise was not found.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to access this resource.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}