import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, timer } from 'rxjs';
import { environment } from '../environments/environment';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BackendHealthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<boolean> {
    return this.http.get<{ status: string }>(`${this.apiUrl}/health`)
      .pipe(
        switchMap(response => of(response.status === 'ok')),
        catchError(() => of(false))
      );
  }

  /**
   * Polls the backend health until it's ready or max retries is reached
   * @param intervalMs How often to check in milliseconds
   * @param maxRetries Maximum number of retries before giving up
   */
  pollUntilHealthy(intervalMs = 2000, maxRetries = 30): Observable<boolean> {
    return timer(0, intervalMs).pipe(      switchMap(count => {
        if (count > maxRetries) {
          return of(false);
        }
        return this.checkHealth();
      }),
      switchMap(isHealthy => {
        if (isHealthy) {
          return of(true); // Successfully connected
        }
        return of(false); // Not healthy yet, return false instead of null
      }),
      catchError(() => of(false))
    );
  }
}
