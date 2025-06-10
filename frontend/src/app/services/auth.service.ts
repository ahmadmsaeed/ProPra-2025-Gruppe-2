import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, fromEvent, timer, Subject } from 'rxjs';
import { tap, catchError, takeUntil, finalize, shareReplay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

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
  
  constructor(private http: HttpClient, private router: Router) {
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
   */
  private initializeFromStorage(): void {
    try {
      const token = this.getStoredToken();
      if (token) {
        const isTokenValid = this.validateToken(token);
        if (isTokenValid) {
          const userData = this.getStoredUser();
          if (userData) {
            this.currentUserSubject.next(userData);
            this.setupTokenExpirationTimer(token);
          } else {
            // Token valid but no user data, fetch from API
            this.refreshUserData().subscribe();
          }
        } else {
          // Token invalid, clear storage
          this.logout(false);
        }
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
      this.logout(false);
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
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/refresh-token`, {}).pipe(
      tap(res => {
        this.storeToken(res.access_token);
        this.setupTokenExpirationTimer(res.access_token);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        if (error.status === 401) {
          this.logout(true);
        }
        return throwError(() => new Error('Failed to refresh token'));
      })
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
   */
  isLoggedIn(): boolean {
    return !!this.getCurrentUser() && !!this.getStoredToken();
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
   * Validate token by checking expiration
   */
  private validateToken(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      return Date.now() < expirationTime;
    } catch (error) {
      console.error('Invalid token format:', error);
      return false;
    }
  }
  
  /**
   * Set up timer to handle token expiration
   */
  private setupTokenExpirationTimer(token: string): void {
    try {
      this.clearExpirationTimer();
      
      const decoded = jwtDecode<JwtPayload>(token);
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (expirationTime <= currentTime) {
        // Token already expired
        this.logout(true);
        return;
      }
      
      const timeToExpiration = expirationTime - currentTime;
      const warningThreshold = environment.authConfig.tokenExpirationWarningThreshold || 5 * 60 * 1000; // Default 5 min
      
      if (timeToExpiration > warningThreshold) {
        // Set timer to warn before expiration
        const warningTime = timeToExpiration - warningThreshold;
        this.tokenExpirationTimer = setTimeout(() => {
          // Refresh token or notify user
          this.refreshToken().subscribe();
        }, warningTime);
      } else {
        // Less than warning threshold left, refresh now
        this.refreshToken().subscribe();
      }
    } catch (error) {
      console.error('Error setting up token expiration timer:', error);
    }
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
