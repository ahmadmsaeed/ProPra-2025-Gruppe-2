import { Component, OnInit, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

interface StudentProgress {
  id: number;
  name: string;
  email: string;
  totalExercises: number;
  completedExercises: number;
  progressPercentage: number;
  lastActivity?: Date;
}

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './student-progress.component.html',
  styleUrls: ['./student-progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentProgressComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  studentProgress: StudentProgress[] = [];
  loading = true;
  error = '';

  displayedColumns: string[] = ['name', 'email', 'progress', 'percentage', 'lastActivity'];
  totalAvailableExercises = 0;

  ngOnInit(): void {
    this.loadStudentProgress();
  }

  loadStudentProgress(): void {
    this.loading = true;
    this.error = '';
    this.loadRealData();
  }

  private loadRealData(): void {
    // Zuerst alle verfügbaren Übungen laden um die Gesamtanzahl zu ermitteln
    this.adminService.getAllExercises().pipe(
      switchMap(exercises => {
        this.totalAvailableExercises = exercises.length;
        
        // Dann alle Studenten laden
        return this.adminService.getStudents();
      }),
      switchMap(students => {
        if (students.length === 0) {
          return of([]);
        }
        
        // Für jeden Studenten den Fortschritt laden
        const progressRequests = students.map(student => 
          this.getStudentProgress(student.id).pipe(
            map(progress => ({
              id: student.id,
              name: student.name,
              email: student.email,
              totalExercises: this.totalAvailableExercises,
              completedExercises: progress.completedExercises,
              progressPercentage: progress.progressPercentage,
              lastActivity: progress.lastActivity
            } as StudentProgress)),
            catchError(error => {
              console.error(`Error loading progress for student ${student.id}:`, error);
              return of({
                id: student.id,
                name: student.name,
                email: student.email,
                totalExercises: this.totalAvailableExercises,
                completedExercises: 0,
                progressPercentage: 0,
                lastActivity: undefined
              } as StudentProgress);
            })
          )
        );
        
        return forkJoin(progressRequests);
      }),
      catchError(error => {
        console.error('Error loading data:', error);
        this.error = 'Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.';
        return of([]);
      })
    ).subscribe({
      next: (progressData) => {
        this.studentProgress = progressData;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error in loadRealData:', error);
        this.error = 'Fehler beim Laden der Fortschrittsdaten';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getStudentProgress(studentId: number): Observable<{
    completedExercises: number;
    progressPercentage: number;
    lastActivity?: Date;
  }> {
    return this.adminService.getStudentProgress(studentId).pipe(
      map(response => ({
        completedExercises: response.completedExercises || 0,
        progressPercentage: response.progressPercentage || 0,
        lastActivity: response.lastActivity ? new Date(response.lastActivity) : undefined
      })),
      catchError(error => {
        console.error(`Error fetching progress for student ${studentId}:`, error);
        return of({
          completedExercises: 0,
          progressPercentage: 0,
          lastActivity: undefined
        });
      })
    );
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'primary';
    if (percentage >= 60) return 'accent';
    return 'warn';
  }

  get authServicePublic() {
    return this.authService;
  }
}