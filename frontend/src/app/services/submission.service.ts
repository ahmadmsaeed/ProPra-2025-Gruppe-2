/**
 * Service for interacting with the submissions API
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Submission } from '../models/submission.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private apiUrl = `${environment.apiUrl}/submissions`;

  constructor(private http: HttpClient) {
    console.log('SubmissionService initialized with API URL:', this.apiUrl);
  }

  /**
   * Get all submissions for the current user
   */
  getMySubmissions(): Observable<Submission[]> {
    console.log('Getting my submissions from:', `${this.apiUrl}/my`);
    return this.http.get<Submission[]>(`${this.apiUrl}/my`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get all submissions for a specific exercise
   */
  getExerciseSubmissions(exerciseId: number): Observable<Submission[]> {
    console.log('Getting exercise submissions for exercise ID:', exerciseId);
    return this.http.get<Submission[]>(`${this.apiUrl}/exercise/${exerciseId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Submit a solution to an exercise
   */
  submitSolution(exerciseId: number, query: string): Observable<Submission> {
    console.log('Submitting solution for exercise ID:', exerciseId);
    console.log('Submission endpoint:', `${this.apiUrl}/submit`);
    console.log('Data being sent:', { exerciseId, query });
    
    return this.http.post<Submission>(`${this.apiUrl}/submit`, { exerciseId, query })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific submission by ID
   */
  getSubmission(id: number): Observable<Submission> {
    console.log('Getting submission with ID:', id);
    return this.http.get<Submission>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse) {
    console.error('API error occurred:', error);
    
    if (error.status === 0) {
      // A client-side or network error occurred
      console.error('Network error:', error.error);
    } else {
      // The backend returned an unsuccessful response code
      console.error(
        `Backend returned code ${error.status}, body was:`,
        error.error
      );
    }
    
    // Return a descriptive error message
    return throwError(() => 
      new Error(`API Error: ${error.status} - ${error.error?.message || error.message || 'An unknown error occurred'}`)
    );
  }
} 