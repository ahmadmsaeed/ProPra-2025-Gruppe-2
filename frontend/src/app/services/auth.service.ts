import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, fromEvent, timer, Subject } from 'rxjs';
import { tap, catchError, takeUntil, finalize, shareReplay, map, mergeMap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { ExerciseSessionService } from './exercise-session.service';

export type UserRole = 'TEACHER' | 'TUTOR' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private destroy$ = new Subject<void>();
  private tokenExpirationTimer: any;
  private readonly storagePrefix = 'sql_learning_';
  
  // Publicly exposed observables
  currentUser$ = this.currentUserSubject.asObservable();
  isLoggedIn$ = this.currentUser$.pipe(map(user => !!user));
  
  constructor(
    private http: HttpClient, 
    private router: Router,
    private exerciseSessionService: ExerciseSessionService
  ) {
    this.initializeFromStorage();
    this.setupActivityMonitoring();
  }
  
  ngOnDestroy(): void {
    this.clearExpirationTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Initialize user data from local storage on service creation
   * Uses a more robust initialization flow with retries and better error handling
   */
  private initializeFromStorage(): void {
    try {
      const token = this.getStoredToken();
      const userData = this.getStoredUser();

      // No stored data, clean initialization
      if (!token && !userData) {
        console.log('No stored auth data found');
        return;
      }

      // Handle case where we have user data but no token
      if (!token && userData) {
        console.log('Found user data but no token, clearing stored data');
        this.clearStoredAuthData();
        return;
      }

      // Validate token
      const isTokenValid = this.validateToken(token!);
      console.log('Token validation result:', isTokenValid);

      // If token is valid and we have user data, initialize session
      if (isTokenValid && userData) {
        console.log('Valid token and user data found, initializing session');
        this.currentUserSubject.next(userData);
        this.setupTokenExpirationTimer(token!);
        
        // Refresh user data in background for latest state
        this.refreshUserData().pipe(
          catchError(error => {
            console.warn('Background user refresh failed:', error);
            return of(null);
          })
        ).subscribe();
        
        return;
      }

      // Token is invalid or missing user data, try to recover
      console.log('Attempting to recover invalid/incomplete session state');
      
      // Only attempt recovery if we have enough data
      if (userData && token) {
        console.log('Attempting token refresh for recovery');
        this.refreshToken().pipe(
          mergeMap(() => this.refreshUserData()),
          timeout(5000), // Don't hang for too long
          catchError(error => {
            console.error('Session recovery failed:', error);
            this.logout(false);
            return throwError(() => error);
          })
        ).subscribe({
          next: () => console.log('Session recovered successfully'),
          error: () => {} // Error already handled in catchError
        });
      } else {
        // Not enough data to attempt recovery
        console.log('Insufficient data for session recovery, clearing auth state');
        this.clearStoredAuthData();
      }
    } catch (error) {
      console.error('Critical error during auth initialization:', error);
      this.clearStoredAuthData();
    }
  }
  
  /**
   * Set up monitoring for user activity to extend session
   */
  private setupActivityMonitoring(): void {
    if (!environment.production) return; // Skip in development
    
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    const activityThreshold = environment.authConfig.sessionTimeout / 2; // Refresh halfway through session
    
    let lastActivity = Date.now();
    
    events.forEach(event => {
      fromEvent(document, event)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          const now = Date.now();
          if (this.isLoggedIn() && (now - lastActivity > activityThreshold)) {
            lastActivity = now;
            this.refreshToken().subscribe();
          }
        });
    });
  }

  /**
   * Registriert einen neuen User.
   */
  register(data: { email: string; password: string; name: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, data).pipe(
      catchError(error => {
        console.error('Registration failed:', error);
        return throwError(() => new Error(error?.error?.message || 'Registration failed'));
      })
    );
  }

  /**
   * Loggt einen User ein und speichert das Token und die Userdaten.
   */
  login(data: { email: string; password: string }): Observable<{ access_token: string; user: User }> {
    return this.http.post<{ access_token: string; user: User }>(`${this.apiUrl}/login`, data).pipe(
      tap(res => {
        this.storeAuthData(res.access_token, res.user);
        this.currentUserSubject.next(res.user);
        this.setupTokenExpirationTimer(res.access_token);
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => new Error(error?.error?.message || 'Login failed'));
      }),
      shareReplay(1) // Cache the successful response to avoid duplicate requests
    );
  }
  
  /**
   * Refreshes the access token
   */
  refreshToken(): Observable<{ access_token: string }> {
    const token = this.getStoredToken();
    
    // Don't attempt refresh if there's no token
    if (!token) {
      return throwError(() => new Error('No token available for refresh'));
    }
    
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/refresh-token`, {}).pipe(
      tap(res => {
        if (!res.access_token) {
          throw new Error('Refresh response missing access token');
        }
        this.storeToken(res.access_token);
        this.setupTokenExpirationTimer(res.access_token);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        // Only logout on specific errors (401, 403)
        if (error.status === 401 || error.status === 403) {
          this.logout(true);
        }
        return throwError(() => new Error('Failed to refresh token'));
      }),
      shareReplay(1) // Cache the response to prevent multiple parallel refreshes
    );
  }

  /**
   * Holt die Userdaten für den eingeloggten User (geschützt).
   * Alias for refreshUserData to fix TypeScript errors in profile component
   */
  me(): Observable<User | null> {
    if (!this.isLoggedIn()) {
      return of(null);
    }
    
    return this.refreshUserData();
  }

  /**
   * Holt die Userdaten für den eingeloggten User (geschützt).
   */
  refreshUserData(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.storeUser(user);
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Failed to refresh user data:', error);
        if (error.status === 401) {
          this.logout(true);
        }
        return throwError(() => new Error('Failed to load user data'));
      })
    );
  }
  
  /**
   * Gibt die aktuelle User-Rolle zurück (oder null).
   */
  getRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  isTeacher(): boolean {
    return this.getRole() === 'TEACHER';
  }
  
  isTutor(): boolean {
    return this.getRole() === 'TUTOR';
  }
  
  isStudent(): boolean {
    return this.getRole() === 'STUDENT';
  }

  /**
   * Loggt den User aus.
   */
  logout(redirect: boolean = true): void {
    // End any active exercise session
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      // Get the current session ID from localStorage
      const sessionId = localStorage.getItem(`${this.storagePrefix}exercise_session`);
      if (sessionId) {
        this.exerciseSessionService.endSession(sessionId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              localStorage.removeItem(`${this.storagePrefix}exercise_session`);
            },
            error: (error) => {
              console.error('Error ending exercise session:', error);
            }
          });
      }
    }

    this.clearExpirationTimer();
    this.clearStoredAuthData();
    this.currentUserSubject.next(null);
    
    if (redirect) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Gibt das gespeicherte JWT zurück.
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Gibt zurück, ob ein User eingeloggt ist.
   * Also checks if the token is valid
   */
  isLoggedIn(): boolean {
    const token = this.getStoredToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) {
      return false;
    }
    
    // Check if token is valid
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const tokenIsValid = Date.now() < decoded.exp * 1000;
      
      if (!tokenIsValid) {
        console.warn('Token expired, logging out');
        this.logout(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid token format, logging out:', error);
      this.logout(true);
      return false;
    }
  }
  
  /**
   * Returns the current user from the BehaviorSubject
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Aktualisiert das Profil (Name/E-Mail).
   */
  updateProfile(data: { name: string; email: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/update-profile`, data).pipe(
      tap(user => {
        this.storeUser(user);
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Profile update failed:', error);
        return throwError(() => new Error(error?.error?.message || 'Failed to update profile'));
      })
    );
  }

  /**
   * Ändert das Passwort.
   */
  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, data).pipe(
      catchError(error => {
        console.error('Password change failed:', error);
        return throwError(() => new Error(error?.error?.message || 'Failed to change password'));
      })
    );
  }
  
  // Private helper methods
  
  /**
   * Store auth data in localStorage
   */
  private storeAuthData(token: string, user: User): void {
    this.storeToken(token);
    this.storeUser(user);
  }
  
  /**
   * Store token in localStorage with prefix
   */
  private storeToken(token: string): void {
    localStorage.setItem(`${this.storagePrefix}token`, token);
  }
  
  /**
   * Store user in localStorage with prefix
   */
  private storeUser(user: User): void {
    localStorage.setItem(`${this.storagePrefix}user`, JSON.stringify(user));
  }
  
  /**
   * Get token from localStorage
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(`${this.storagePrefix}token`);
  }
  
  /**
   * Get user from localStorage
   */
  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(`${this.storagePrefix}user`);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch (e) {
      console.error('Error parsing stored user data:', e);
      return null;
    }
  }
  
  /**
   * Clear all auth data from localStorage
   */
  private clearStoredAuthData(): void {
    localStorage.removeItem(`${this.storagePrefix}token`);
    localStorage.removeItem(`${this.storagePrefix}user`);
  }
  
  /**
   * Validate token by checking expiration and structure
   */
  private validateToken(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Check required token fields
      if (!decoded.sub || !decoded.email || !decoded.role) {
        console.error('Token missing required fields');
        return false;
      }
      
      // Check if token is expired
      if (currentTime >= expirationTime) {
        console.log('Token is expired');
        return false;
      }
      
      // Check if token was issued in the future (clock skew)
      const issuedAt = decoded.iat * 1000;
      if (issuedAt > currentTime + 60000) { // Allow 1 minute clock skew
        console.error('Token issued in future - possible clock skew');
        return false;
      }
      
      // Check if token is too old (max 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (currentTime - issuedAt > maxAge) {
        console.log('Token exceeds maximum age');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid token format:', error);
      return false;
    }
  }
  
  /**
   * Set up timer to handle token expiration with smart refresh windows
   */
  private setupTokenExpirationTimer(token: string): void {
    try {
      this.clearExpirationTimer();
      
      const decoded = jwtDecode<JwtPayload>(token);
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (expirationTime <= currentTime) {
        console.log('Token already expired, logging out');
        this.logout(true);
        return;
      }
      
      const timeToExpiration = expirationTime - currentTime;
      const refreshWindow = this.calculateRefreshWindow(timeToExpiration);
      
      console.log(`Token expires in ${Math.round(timeToExpiration / 1000)}s, will refresh in ${Math.round(refreshWindow / 1000)}s`);
      
      this.tokenExpirationTimer = setTimeout(() => {
        console.log('Token refresh window reached, attempting refresh');
        this.refreshToken().subscribe({
          next: () => console.log('Token refreshed successfully'),
          error: (error) => {
            console.error('Failed to refresh token:', error);
            if (error.status === 401 || error.status === 403) {
              this.logout(true);
            }
          }
        });
      }, refreshWindow);
    } catch (error) {
      console.error('Error setting up token expiration timer:', error);
    }
  }

  /**
   * Calculate when to refresh the token based on its expiration time
   * Uses a sliding window approach to prevent token expiration
   */
  private calculateRefreshWindow(timeToExpiration: number): number {
    const minRefreshInterval = 5 * 60 * 1000; // 5 minutes
    const maxRefreshInterval = 60 * 60 * 1000; // 1 hour
    
    // If token expires in less than minRefreshInterval, refresh at halfway point
    if (timeToExpiration < minRefreshInterval) {
      return timeToExpiration / 2;
    }
    
    // If token expires in less than maxRefreshInterval, refresh when 75% of time has passed
    if (timeToExpiration < maxRefreshInterval) {
      return timeToExpiration * 0.75;
    }
    
    // For long-lived tokens, refresh hourly
    return maxRefreshInterval;
  }
  
  /**
   * Clear any active expiration timers
   */
  private clearExpirationTimer(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
  }
}
