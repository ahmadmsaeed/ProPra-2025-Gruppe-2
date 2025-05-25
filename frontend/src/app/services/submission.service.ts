/**
 * Service for interacting with the submissions API
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, of, BehaviorSubject, shareReplay, timer } from 'rxjs';
import { tap, retry, timeout, map, switchMap } from 'rxjs/operators';
import { Submission } from '../models/submission.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private apiUrl = `${environment.apiUrl}/submissions`;
  
  // Cache for submissions data
  private mySubmissionsCache: Observable<Submission[]> | null = null;
  private exerciseSubmissionsCache: Map<number, Observable<Submission[]>> = new Map();
  private submissionCache: Map<number, Observable<Submission>> = new Map();
  
  // Recent submissions store for optimistic updates
  private recentSubmissions = new BehaviorSubject<Submission[]>([]);
  recentSubmissions$ = this.recentSubmissions.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all submissions for the current user with caching
   */
  getMySubmissions(): Observable<Submission[]> {
    // Return cached response if available (with short TTL)
    if (this.mySubmissionsCache) {
      return this.mySubmissionsCache;
    }
    
    // Create a new request and cache it
    this.mySubmissionsCache = this.http.get<Submission[]>(`${this.apiUrl}/my`).pipe(
      retry(2),
      timeout(30000),
      tap(submissions => {
        // Store recent submissions for optimistic updates
        this.recentSubmissions.next(submissions.slice(0, 5));
      }),
      shareReplay({ bufferSize: 1, refCount: true, windowTime: 60000 }), // Cache with 1 min TTL
      catchError(this.handleError)
    );
    
    // Auto invalidate cache after TTL
    timer(60000).subscribe(() => this.mySubmissionsCache = null);
    
    return this.mySubmissionsCache;
  }

  /**
   * Get all submissions for a specific exercise with caching
   */
  getExerciseSubmissions(exerciseId: number): Observable<Submission[]> {
    // Return cached response if available
    if (this.exerciseSubmissionsCache.has(exerciseId)) {
      return this.exerciseSubmissionsCache.get(exerciseId)!;
    }
    
    // Create a new request and cache it
    const request = this.http.get<Submission[]>(`${this.apiUrl}/exercise/${exerciseId}`).pipe(
      retry(2),
      timeout(30000),
      shareReplay(1),
      catchError(this.handleError)
    );
    
    this.exerciseSubmissionsCache.set(exerciseId, request);
    return request;
  }

  /**
   * Submit a solution to an exercise
   */
  submitSolution(exerciseId: number, query: string, sessionId: string): Observable<Submission> {
    return this.http.post<Submission>(`${this.apiUrl}/submit`, { exerciseId, query, sessionId }).pipe(
      tap(submission => {
        // Invalidate cache for the relevant exercise
        this.exerciseSubmissionsCache.delete(exerciseId);
        this.mySubmissionsCache = null;
        
        // Update recent submissions for optimistic UI
        const current = this.recentSubmissions.value;
        this.recentSubmissions.next([submission, ...current].slice(0, 5));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a specific submission by ID with caching
   */
  getSubmission(id: number): Observable<Submission> {
    // Return cached response if available
    if (this.submissionCache.has(id)) {
      return this.submissionCache.get(id)!;
    }
    
    // Create a new request and cache it
    const request = this.http.get<Submission>(`${this.apiUrl}/${id}`).pipe(
      retry(2),
      timeout(30000),
      shareReplay(1),
      catchError(this.handleError)
    );
    
    this.submissionCache.set(id, request);
    return request;
  }
  
  /**
   * Get user success rate
   */
  getSuccessRate(): Observable<number> {
    return this.getMySubmissions().pipe(
      map(submissions => {
        if (submissions.length === 0) return 0;
        const correct = submissions.filter(s => s.isCorrect).length;
        return Math.round((correct / submissions.length) * 100);
      })
    );
  }
  
  /**
   * Invalidate all cached data
   */
  invalidateCache(): void {
    this.mySubmissionsCache = null;
    this.exerciseSubmissionsCache.clear();
    this.submissionCache.clear();
  }

  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.status === 404) {
      errorMessage = 'The requested submission was not found.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to access this resource.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}