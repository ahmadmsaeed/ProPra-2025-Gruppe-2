import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService, UserRole } from './auth.service';
import { AdminService } from './admin.service';
import { Observable, catchError, map, of, forkJoin } from 'rxjs';

// Define a component for the user dialog that will be implemented later
// This avoids the import error while we're still developing
@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `<div>User Dialog Placeholder</div>`
})
export class UserDialogComponent {
  // Will be implemented properly in a separate file
}

interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styles: [`
    .actions-panel {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {

  teachers: User[] = [];
  students: User[] = [];
  loading = true;
  error: string | null = null;

  teacherColumns: string[] = ['id', 'name', 'email', 'role', 'createdAt', 'isBlocked', 'actions'];
  studentColumns: string[] = ['id', 'name', 'email', 'createdAt', 'isBlocked', 'actions'];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.authService.isTeacher()) {
      this.loadData();
    } else {
      this.error = "Access Denied.";
      this.loading = false;
    }
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    const teachersRequest = this.http.get<User[]>('http://localhost:3000/admin/teachers').pipe(
      catchError(err => {
        this.handleError('Failed to load teachers', err);
        return of([]); // Return empty array on error
      })
    );

    const studentsRequest = this.http.get<User[]>('http://localhost:3000/admin/students').pipe(
      catchError(err => {
        this.handleError('Failed to load students', err);
        return of([]); // Return empty array on error
      })
    );

    forkJoin({ teachers: teachersRequest, students: studentsRequest }).subscribe({
      next: ({ teachers, students }) => {
        this.teachers = teachers;
        this.students = students;
        this.loading = false;
      },
      // Errors are caught individually in pipes, forkJoin completes even if one fails
      complete: () => {
        this.loading = false; // Ensure loading is false even if requests error out
      }
    });
  }

  openAddUserDialog(role: 'STUDENT' | 'TUTOR'): void {
    // For now we'll just show a simple alert
    // The real implementation would use MatDialog to open UserDialogComponent
    alert(`Add new ${role} functionality coming soon`);
    
    // When we implement the full dialog:
    /*
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: { 
        title: `Add New ${role.charAt(0) + role.slice(1).toLowerCase()}`,
        user: { role: role },
        isEdit: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.post<User>('http://localhost:3000/admin/users', result).subscribe({
          next: () => {
            this.snackBar.open(`${result.role.toLowerCase()} created successfully`, 'Close', { duration: 3000 });
            this.loadData(); // Refresh data
          },
          error: (err) => this.handleError(`Failed to create ${result.role.toLowerCase()}`, err)
        });
      }
    });
    */
  }

  editUser(user: User): void {
    // For now we'll just show a simple alert
    alert(`Edit user ${user.name} functionality coming soon`);
    
    // When we implement the full dialog:
    /*
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: { 
        title: `Edit User: ${user.name}`,
        user: { ...user },
        isEdit: true 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.put<User>(`http://localhost:3000/admin/users/${user.id}`, result).subscribe({
          next: () => {
            this.snackBar.open('User updated successfully', 'Close', { duration: 3000 });
            this.loadData(); // Refresh data
          },
          error: (err) => this.handleError('Failed to update user', err)
        });
      }
    });
    */
  }

  deleteUser(userId: number): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      // For demo purposes, just show a success message
      this.snackBar.open('User deletion functionality coming soon', 'Close', { duration: 3000 });
      
      // When the backend is ready:
      /*
      this.http.delete<void>(`http://localhost:3000/admin/users/${userId}`).subscribe({
        next: () => {
          this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
          this.loadData(); // Refresh data
        },
        error: (err) => this.handleError('Failed to delete user', err)
      });
      */
    }
  }

  blockUser(userId: number): void {
    this.http.patch<User>(`http://localhost:3000/admin/users/${userId}/block`, {}).subscribe({
      next: () => {
        this.snackBar.open('User blocked successfully.', 'Close', { duration: 3000 });
        this.refreshUserData(userId, true); // Refresh UI
      },
      error: (err) => this.handleError('Failed to block user', err),
    });
  }

  unblockUser(userId: number): void {
    this.http.patch<User>(`http://localhost:3000/admin/users/${userId}/unblock`, {}).subscribe({
      next: () => {
        this.snackBar.open('User unblocked successfully.', 'Close', { duration: 3000 });
        this.refreshUserData(userId, false); // Refresh UI
      },
      error: (err) => this.handleError('Failed to unblock user', err),
    });
  }

  private refreshUserData(userId: number, isBlocked: boolean): void {
    // Optimistic UI update: Update the local data without reloading everything
    this.teachers = this.teachers.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.students = this.students.map(u => u.id === userId ? { ...u, isBlocked } : u);
    // Alternatively, call this.loadData() for a full refresh
  }

  private handleError(message: string, error: HttpErrorResponse): void {
    console.error(message, error);
    this.error = `${message}: ${error.error?.message || error.statusText}`;
    this.snackBar.open(this.error, 'Close', { duration: 5000 });
    this.loading = false; // Ensure loading stops on error
  }
}
