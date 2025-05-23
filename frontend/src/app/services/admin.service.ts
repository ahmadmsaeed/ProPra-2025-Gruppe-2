import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserRole } from './auth.service';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // User listing endpoints
  getTeachers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/teachers`);
  }

  getTutors(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/tutors`);
  }

  getStudents(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/students`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  // User management endpoints
  createUser(userData: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData);
  }

  updateUser(userId: number, userData: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}`, userData);
  }

  updateUserRole(userId: number, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  blockUser(userId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/block`, {});
  }

  unblockUser(userId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${userId}/unblock`, {});
  }
}
