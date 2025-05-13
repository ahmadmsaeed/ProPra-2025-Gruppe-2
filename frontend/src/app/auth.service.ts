import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../environments/environment';

export type UserRole = 'TEACHER' | 'TUTOR' | 'STUDENT';
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const user = localStorage.getItem('user');
    if (user) this.currentUserSubject.next(JSON.parse(user));
  }

  /**
   * Registriert einen neuen User.
   */
  register(data: { email: string; password: string; name: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, data);
  }

  /**
   * Loggt einen User ein und speichert das Token und die Userdaten.
   */
  login(data: { email: string; password: string }): Observable<{ access_token: string; user: User }> {
    return this.http.post<{ access_token: string; user: User }>(`${this.apiUrl}/login`, data).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
      })
    );
  }

  /**
   * Holt die Userdaten für den eingeloggten User (geschützt).
   */
  me(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        // Userdaten ggf. aktualisieren (inkl. Rolle)
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }
  /**
   * Gibt die aktuelle User-Rolle zurück (oder null).
   */
  getRole(): UserRole | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user).role as UserRole;
      } catch {
        return null;
      }
    }
    return null;
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
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  /**
   * Gibt das gespeicherte JWT zurück.
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Gibt zurück, ob ein User eingeloggt ist.
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
