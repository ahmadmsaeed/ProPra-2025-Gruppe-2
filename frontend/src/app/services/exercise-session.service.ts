import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExerciseSession {
  sessionId: string;
  message: string;
}

export interface SessionResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseSessionService {
  private readonly apiUrl = `${environment.apiUrl}/exercise-sessions`;

  constructor(private http: HttpClient) {}

  /**
   * Start a new exercise session
   */
  startSession(exerciseId: number): Observable<ExerciseSession> {
    return this.http.post<ExerciseSession>(`${this.apiUrl}/start`, { exerciseId });
  }

  /**
   * Execute a query in the current exercise session
   */
  executeQuery(sessionId: string, query: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/query/${sessionId}`, { query });
  }

  /**
   * End the current exercise session
   */
  endSession(sessionId: string): Observable<SessionResult> {
    return this.http.delete<SessionResult>(`${this.apiUrl}/${sessionId}`);
  }

  /**
   * Stop all exercise sessions for the user
   */
  stopAllSessionsForUser() {
    return this.http.post(`${this.apiUrl}/stop-all`, {});
  }

  /**
   * Reset the current exercise session
   */
  resetSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset/${sessionId}`, {});
  }
}