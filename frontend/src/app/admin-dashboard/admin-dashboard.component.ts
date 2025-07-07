import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AdminService, User } from '../services/admin.service';
import { Observable, catchError, map, of, forkJoin, Subject, takeUntil, finalize } from 'rxjs';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { environment } from '../../environments/environment';
import { BaseComponent } from '../shared/components/base.component';

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
export class AdminDashboardComponent extends BaseComponent implements OnInit {
  protected override destroy$ = new Subject<void>();

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
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.authService.isTeacher()) {
      this.loadData();
    } else {
      this.error = "Access Denied.";
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    super.ngOnDestroy();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const teachersRequest = this.adminService.getTeachers().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError(err, 'Failed to load teachers');
        return of([]);
      })
    );

    const tutorsRequest = this.adminService.getTutors().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError(err, 'Failed to load tutors');
        return of([]);
      })
    );

    const studentsRequest = this.adminService.getStudents().pipe(
      catchError((err: HttpErrorResponse) => {
        this.handleError(err, 'Failed to load students');
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
    const dialogRef = this.dialogService.openDialog(UserDialogComponent, {
      width: '400px',
      data: {
        title: 'Neuen Benutzer hinzufügen',
        user: { role: 'STUDENT' },
        isEdit: false
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        if (result) {
          this.adminService.createUser(result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.showSuccess('Benutzer erfolgreich erstellt');
                this.loadData();
              },
              error: (err: HttpErrorResponse) => {
                super.handleError(err, 'Fehler beim Erstellen des Benutzers');
              }
            });
        }
      });
  }

  editUser(user: User): void {
    const dialogRef = this.dialogService.openDialog(UserDialogComponent, {
      width: '400px',
      data: {
        title: `Benutzer bearbeiten: ${user.name}`,
        user: { ...user },
        isEdit: true
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        if (result) {
          this.adminService.updateUser(user.id, result)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.showSuccess('Benutzer erfolgreich aktualisiert');
                this.loadData();
              },
              error: (err: HttpErrorResponse) => super.handleError(err, 'Fehler beim Aktualisieren des Benutzers')
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
            this.showSuccess('Benutzer erfolgreich gelöscht');
            this.loadData();
          },
          error: (err: HttpErrorResponse) => this.handleError(err, 'Fehler beim Löschen des Benutzers')
        });
    }
  }

  blockUser(userId: number): void {
    this.adminService.blockUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Benutzer erfolgreich blockiert');
          this.refreshUserData(userId, true);
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Failed to block user'),
      });
  }

  unblockUser(userId: number): void {
    this.adminService.unblockUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Benutzer erfolgreich entsperrt');
          this.refreshUserData(userId, false);
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Failed to unblock user'),
      });
  }

  private refreshUserData(userId: number, isBlocked: boolean): void {
    // Optimistic UI update: Update the local data without reloading everything
    this.teachers = this.teachers.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.tutors = this.tutors.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.students = this.students.map(u => u.id === userId ? { ...u, isBlocked } : u);
    this.cdr.markForCheck();
  }
}
