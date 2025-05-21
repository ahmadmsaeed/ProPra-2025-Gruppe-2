import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AdminService, User } from '../services/admin.service';
import { Observable, catchError, map, of, forkJoin, Subject, takeUntil, finalize } from 'rxjs';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { environment } from '../../environments/environment';

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
  ],  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private destroy$ = new Subject<void>();

  teachers: User[] = [];
  tutors: User[] = [];
  students: User[] = [];
  loading = true;
  error: string | null = null;

  teacherColumns: string[] = ['id', 'name', 'email', 'role', 'createdAt', 'isBlocked', 'actions'];
  tutorColumns: string[] = ['id', 'name', 'email', 'createdAt', 'isBlocked', 'actions'];
  studentColumns: string[] = ['id', 'name', 'email', 'createdAt', 'isBlocked', 'actions'];

  constructor(
    public authService: AuthService,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isTeacher()) {
      this.loadData();
    } else {
      this.error = "Access Denied.";
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const teachersRequest = this.adminService.getTeachers().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError('Failed to load teachers', err);
        return of([]);
      })
    );

    const tutorsRequest = this.adminService.getTutors().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError('Failed to load tutors', err);
        return of([]);
      })
    );

    const studentsRequest = this.adminService.getStudents().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError('Failed to load students', err);
        return of([]);
      })
    );

    forkJoin({ 
      teachers: teachersRequest, 
      tutors: tutorsRequest, 
      students: studentsRequest 
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: ({ teachers, tutors, students }) => {
        this.teachers = teachers;
        this.tutors = tutors;
        this.students = students;
      }
    });
  }

  openAddUserDialog(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: {
        title: 'Neuen Benutzer hinzufügen',
        user: { role: 'STUDENT' },
        isEdit: false
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.adminService.createUser(result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open('Benutzer erfolgreich erstellt', 'Schließen', { duration: 3000 });
                this.loadData();
              },
              error: (err: HttpErrorResponse) => this.handleError('Fehler beim Erstellen des Benutzers', err)
            });
        }
      });
  }

  editUser(user: User): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: {
        title: `Benutzer bearbeiten: ${user.name}`,
        user: { ...user },
        isEdit: true
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.adminService.updateUser(user.id, result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.snackBar.open('Benutzer erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
                this.loadData();
              },
              error: (err: HttpErrorResponse) => this.handleError('Fehler beim Aktualisieren des Benutzers', err)
            });
        }
      });
  }

  deleteUser(userId: number): void {
    if (confirm('Möchten Sie diesen Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      this.adminService.deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Benutzer erfolgreich gelöscht', 'Schließen', { duration: 3000 });
            this.loadData();
          },
          error: (err: HttpErrorResponse) => this.handleError('Fehler beim Löschen des Benutzers', err)
        });
    }
  }

  blockUser(userId: number): void {
    this.adminService.blockUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('User blocked successfully.', 'Close', { duration: 3000 });
          this.refreshUserData(userId, true);
        },
        error: (err: HttpErrorResponse) => this.handleError('Failed to block user', err),
      });
  }

  unblockUser(userId: number): void {
    this.adminService.unblockUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('User unblocked successfully.', 'Close', { duration: 3000 });
          this.refreshUserData(userId, false);
        },
        error: (err: HttpErrorResponse) => this.handleError('Failed to unblock user', err),
      });
  }

  private refreshUserData(userId: number, isBlocked: boolean): void {
    // Optimistic UI update: Update the local data without reloading everything
    this.teachers = this.teachers.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.tutors = this.tutors.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.students = this.students.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.cdr.markForCheck();
  }

  private handleError(message: string, error: HttpErrorResponse): void {
    console.error(message, error);
    this.error = `${message}: ${error.error?.message || error.statusText}`;
    this.snackBar.open(this.error, 'Close', { duration: 5000 });
    this.loading = false;
    this.cdr.markForCheck();
  }
}
